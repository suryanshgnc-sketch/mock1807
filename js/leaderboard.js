/* ============================================================
   MDCCCVII TESTS — LIVE LEADERBOARD
   ------------------------------------------------------------
   Features:
   • Overall leaderboard
   • Separate leaderboard for every test
   • Best attempt per student per test
   • Live refresh
   • Refreshes after tab becomes visible
   • Refresh button
   • Automatic test-list refresh
   • Auth-aware
   • BIGINT test IDs
   • No UUID conversion
   ============================================================ */

'use strict';

(() => {

  /* ==========================================================
     DOM HELPERS
     ========================================================== */

  const $ = (selector) =>
    document.querySelector(selector);


  /* ==========================================================
     STATE
     ========================================================== */

  let sb = null;

  let tests = [];

  let selectedTest = 'all';

  let initialized = false;

  let leaderboardTimer = null;

  let testsTimer = null;

  let loadingLeaderboard = false;

  let loadingTests = false;

  let lastSuccessfulLoad = 0;


  /*
   * Leaderboard refresh interval.
   *
   * 10 seconds gives a "live" feeling without hammering
   * Supabase on every second.
   */
  const LEADERBOARD_INTERVAL = 10000;


  /*
   * Test list refresh.
   *
   * This allows newly released/enabled tests to appear
   * without requiring a page refresh.
   */
  const TESTS_INTERVAL = 30000;


  /* ==========================================================
     SECURITY / HTML ESCAPING
     ========================================================== */

  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char])
    );


  /* ==========================================================
     NUMBER FORMATTING
     ========================================================== */

  const formatScore = (value) => {

    const n = Number(value);

    if (!Number.isFinite(n)) {
      return '0';
    }

    return Number.isInteger(n)
      ? String(n)
      : n.toFixed(1);
  };


  const formatTime = (seconds) => {

    const s = Math.max(
      0,
      Number(seconds) || 0
    );

    const hours =
      Math.floor(s / 3600);

    const minutes =
      Math.floor((s % 3600) / 60);

    const secs =
      Math.floor(s % 60);


    if (hours > 0) {

      return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }


    if (minutes > 0) {

      return `${minutes}m ${String(secs).padStart(2, '0')}s`;
    }


    return `${secs}s`;
  };


  /* ==========================================================
     INITIALS
     ========================================================== */

  const initials = (name) => {

    const clean =
      String(name || 'Student')
        .trim();


    if (!clean) {
      return 'ST';
    }


    const parts =
      clean.split(/\s+/);


    return parts
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };


  /* ==========================================================
     AVATAR
     ========================================================== */

  const avatar = (row) => {

    if (row.photo_url) {

      return `
        <img
          class="lb-av"
          src="${esc(row.photo_url)}"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none';"
        >
      `;
    }


    return `
      <span class="lb-av">
        ${esc(initials(row.name))}
      </span>
    `;
  };


  /* ==========================================================
     MESSAGE
     ========================================================== */

  function setMessage(
    message,
    type = ''
  ) {

    const box =
      $('#lbBody');

    if (!box) {
      return;
    }


    box.innerHTML = `
      <div class="bt-empty ${type ? `bt-${type}` : ''}">
        ${esc(message)}
      </div>
    `;
  }


  /* ==========================================================
     LOADING STATE
     ========================================================== */

  function setLoading() {

    const box =
      $('#lbBody');

    if (!box) {
      return;
    }


    /*
     * Don't destroy the existing leaderboard on every
     * 10-second refresh. Only show the loading UI when
     * there is currently no rendered leaderboard.
     */
    if (
      box.dataset.hasLeaderboard === 'true'
    ) {
      return;
    }


    setMessage(
      'Loading rankings…'
    );
  }


  /* ==========================================================
     NORMALIZE ROWS
     ========================================================== */

  function normalizeRows(rows) {

    if (!Array.isArray(rows)) {
      return [];
    }


    return rows
      .map((row, index) => {

        const rank =
          Number(row?.rank);


        const score =
          Number(row?.score);


        const maxScore =
          Number(row?.max_score);


        const correct =
          Number(row?.correct_count);


        const time =
          Number(row?.time_taken_seconds);


        return {

          ...row,

          rank:
            Number.isFinite(rank)
              ? rank
              : index + 1,

          score:
            Number.isFinite(score)
              ? score
              : 0,

          max_score:
            Number.isFinite(maxScore)
              ? maxScore
              : 0,

          correct_count:
            Number.isFinite(correct)
              ? correct
              : 0,

          time_taken_seconds:
            Number.isFinite(time)
              ? time
              : 0,

          is_me:
            row?.is_me === true ||
            row?.is_me === 'true'

        };

      })

      .sort(
        (a, b) =>
          a.rank - b.rank
      );
  }


  /* ==========================================================
     RENDER
     ========================================================== */

  function render(rows) {

    const box =
      $('#lbBody');

    if (!box) {
      return;
    }


    const normalized =
      normalizeRows(rows);


    if (
      normalized.length === 0
    ) {

      box.dataset.hasLeaderboard =
        'false';


      setMessage(
        'No ranked attempts yet. Complete a test and submit it to appear here.'
      );

      return;
    }


    /*
     * Mark that the UI has real data.
     *
     * This prevents the 10-second live refresh from flashing
     * "Loading rankings…" every time.
     */
    box.dataset.hasLeaderboard =
      'true';


    const top =
      normalized.slice(0, 3);


    const me =
      normalized.find(
        (row) => row.is_me
      );


    /* ========================================================
       PERCENTILE
       ======================================================== */

    let percentile = 0;


    if (me) {

      if (
        normalized.length <= 1
      ) {

        percentile = 100;

      } else {

        percentile =
          Math.round(
            (
              (
                normalized.length -
                me.rank
              )
              /
              (
                normalized.length -
                1
              )
            ) * 100
          );

      }
    }


    percentile =
      Math.max(
        0,
        Math.min(
          100,
          percentile
        )
      );


    /* ========================================================
       PODIUM
       ======================================================== */

    const podium =
      [
        top[1],
        top[0],
        top[2]
      ]

      .filter(Boolean)

      .map(
        (row) => {

          return `
            <div class="pod p${Math.min(row.rank, 3)}">

              <span class="pod-rank">
                ${row.rank}
              </span>

              ${avatar(row)}

              <b>
                ${esc(row.name || 'Student')}
                ${row.is_me ? ' (You)' : ''}
              </b>

              <em>
                ${formatScore(row.score)}
                <small>
                  /
                  ${formatScore(row.max_score)}
                </small>
              </em>

            </div>
          `;
        }
      )
      .join('');


    /* ========================================================
       TABLE
       ======================================================== */

    const tableRows =
      normalized

        .slice(0, 100)

        .map(
          (row) => {

            const medal =
              row.rank === 1
                ? '🥇'
                : row.rank === 2
                  ? '🥈'
                  : row.rank === 3
                    ? '🥉'
                    : '';


            return `
              <div
                class="lb-row${row.is_me ? ' me' : ''}"
                data-rank="${row.rank}"
              >

                <span class="lb-rk">

                  ${
                    medal
                      ? `${medal} `
                      : ''
                  }

                  ${row.rank}

                </span>


                <span class="lb-st">

                  ${avatar(row)}

                  <span>
                    ${esc(row.name || 'Student')}

                    ${
                      row.is_me
                        ? ' <i>You</i>'
                        : ''
                    }
                  </span>

                </span>


                <span>

                  <b>
                    ${formatScore(row.score)}
                  </b>

                  /

                  ${formatScore(row.max_score)}

                </span>


                <span>
                  ${row.correct_count}
                </span>


                <span>
                  ${formatTime(row.time_taken_seconds)}
                </span>

              </div>
            `;
          }
        )
        .join('');


    /* ========================================================
       FINAL HTML
       ======================================================== */

    box.innerHTML = `

      ${
        me
          ? `
            <div class="lb-me">

              <div>
                <small>
                  Your rank
                </small>

                <b>
                  #${me.rank}
                </b>
              </div>


              <div>
                <small>
                  Score
                </small>

                <b>
                  ${formatScore(me.score)}
                  /
                  ${formatScore(me.max_score)}
                </b>
              </div>


              <div>
                <small>
                  Percentile
                </small>

                <b>
                  ${percentile}%
                </b>
              </div>


              <div>
                <small>
                  Ranked students
                </small>

                <b>
                  ${normalized.length}
                </b>
              </div>

            </div>
          `
          : ''
      }


      ${
        podium
          ? `
            <div class="podium">
              ${podium}
            </div>
          `
          : ''
      }


      <div class="lb-table">

        <div class="lb-row lb-h">

          <span>
            Rank
          </span>

          <span>
            Student
          </span>

          <span>
            Score
          </span>

          <span>
            Correct
          </span>

          <span>
            Time
          </span>

        </div>


        ${tableRows}

      </div>

    `;


    /*
     * Small timestamp for debugging / future UI use.
     */
    box.dataset.updatedAt =
      String(Date.now());
  }


  /* ==========================================================
     CURRENT TEST ID
     ========================================================== */

  function getSelectedTestId() {

    if (
      selectedTest === 'all' ||
      selectedTest === '' ||
      selectedTest === null ||
      selectedTest === undefined
    ) {
      return null;
    }


    /*
     * Test IDs are BIGINT.
     *
     * Number is safe for normal Supabase IDs.
     */
    const id =
      Number(selectedTest);


    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {

      console.error(
        '[Leaderboard] Invalid test ID:',
        selectedTest
      );

      return undefined;
    }


    return id;
  }


  /* ==========================================================
     LOAD LEADERBOARD
     ========================================================== */

  async function loadLeaderboard(
    options = {}
  ) {

    const {
      showLoading = false
    } = options;


    if (!sb) {
      return;
    }


    if (loadingLeaderboard) {
      return;
    }


    const box =
      $('#lbBody');


    if (!box) {
      return;
    }


    loadingLeaderboard = true;


    if (showLoading) {
      setLoading();
    }


    try {

      /* ------------------------------------------------------
         SESSION
         ------------------------------------------------------ */

      const {
        data: sessionData,
        error: sessionError
      } =
        await sb.auth.getSession();


      if (sessionError) {

        console.error(
          '[Leaderboard] Session error:',
          sessionError
        );

        setMessage(
          'Your session could not be verified. Please refresh the page.',
          'error'
        );

        return;
      }


      if (
        !sessionData?.session
      ) {

        box.dataset.hasLeaderboard =
          'false';


        setMessage(
          'Sign in to view the leaderboard.'
        );

        return;
      }


      /* ------------------------------------------------------
         TEST ID
         ------------------------------------------------------ */

      const testId =
        getSelectedTestId();


      if (
        testId === undefined
      ) {

        setMessage(
          'Invalid test selection.',
          'error'
        );

        return;
      }


      console.log(
        '[Leaderboard] Loading:',
        testId === null
          ? 'OVERALL'
          : `TEST ${testId}`
      );


      /* ------------------------------------------------------
         RPC
         ------------------------------------------------------ */

      const {
        data,
        error
      } =
        await sb.rpc(
          'get_leaderboard',
          {
            p_test_id:
              testId
          }
        );


      if (error) {

        console.error(
          '[Leaderboard] RPC error:',
          error
        );


        /*
         * Don't destroy an already working leaderboard
         * during a background refresh.
         */
        if (
          box.dataset.hasLeaderboard !== 'true'
        ) {

          setMessage(
            error.message ||
              'Rankings are not available right now.',
            'error'
          );
        }


        return;
      }


      const rows =
        Array.isArray(data)
          ? data
          : [];


      console.log(
        '[Leaderboard] Rows received:',
        rows.length
      );


      render(rows);


      lastSuccessfulLoad =
        Date.now();


    } catch (error) {

      console.error(
        '[Leaderboard] Unexpected error:',
        error
      );


      if (
        box.dataset.hasLeaderboard !== 'true'
      ) {

        setMessage(
          'Something went wrong while loading rankings.',
          'error'
        );
      }

    } finally {

      loadingLeaderboard =
        false;
    }
  }


  /* ==========================================================
     LOAD TESTS
     ========================================================== */

  async function loadTests(
    preserveSelection = true
  ) {

    if (!sb) {
      return;
    }


    if (loadingTests) {
      return;
    }


    const selector =
      $('#lbSel');


    if (!selector) {
      return;
    }


    loadingTests = true;


    try {

      const {
        data,
        error
      } =
        await sb

          .from('tests')

          .select(
            'id,name,release_at,leaderboard_enabled,enabled,archived'
          )

          .eq(
            'enabled',
            true
          )

          .eq(
            'leaderboard_enabled',
            true
          )

          .or(
            'archived.is.null,archived.eq.false'
          )

          .order(
            'release_at',
            {
              ascending: false,
              nullsFirst: false
            }
          );


      if (error) {

        console.error(
          '[Leaderboard] Test list error:',
          error
        );

        return;
      }


      const now =
        Date.now();


      tests =
        (data || [])
          .filter(
            (test) => {

              /*
               * If there is no release time,
               * show it immediately.
               */
              if (
                !test.release_at
              ) {
                return true;
              }


              const release =
                new Date(
                  test.release_at
                ).getTime();


              if (
                Number.isNaN(release)
              ) {
                return false;
              }


              return release <= now;
            }
          );


      /* ------------------------------------------------------
         Preserve selected test
         ------------------------------------------------------ */

      const previous =
        preserveSelection
          ? String(selectedTest)
          : 'all';


      selector.innerHTML = `

        <option value="all">
          Overall
        </option>

        ${tests
          .map(
            (test) => `

              <option
                value="${esc(test.id)}"
              >
                ${esc(
                  test.name ||
                  `Test ${test.id}`
                )}
              </option>

            `
          )
          .join('')}

      `;


      const validValues = [
        'all',
        ...tests.map(
          (test) =>
            String(test.id)
        )
      ];


      if (
        validValues.includes(previous)
      ) {

        selectedTest =
          previous;

      } else {

        selectedTest =
          'all';
      }


      selector.value =
        selectedTest;


      /* ------------------------------------------------------
         Change handler
         ------------------------------------------------------ */

      if (
        !selector.__lbBound
      ) {

        selector.__lbBound =
          true;


        selector.addEventListener(
          'change',
          () => {

            selectedTest =
              selector.value ||
              'all';


            console.log(
              '[Leaderboard] Test changed:',
              selectedTest
            );


            loadLeaderboard({
              showLoading: true
            });

          }
        );
      }


    } catch (error) {

      console.error(
        '[Leaderboard] Test list error:',
        error
      );

    } finally {

      loadingTests =
        false;
    }
  }


  /* ==========================================================
     REFRESH BUTTON
     ========================================================== */

  function bindRefresh() {

    const button =
      $('#lbRefresh');


    if (
      !button ||
      button.__lbBound
    ) {
      return;
    }


    button.__lbBound =
      true;


    button.addEventListener(
      'click',
      async () => {

        if (
          button.dataset.loading === 'true'
        ) {
          return;
        }


        button.dataset.loading =
          'true';


        const originalHTML =
          button.innerHTML;


        button.innerHTML =
          'Refreshing…';


        try {

          await loadTests(true);

          await loadLeaderboard({
            showLoading: false
          });

        } finally {

          button.dataset.loading =
            'false';


          button.innerHTML =
            originalHTML;
        }
      }
    );
  }


  /* ==========================================================
     LIVE LEADERBOARD
     ========================================================== */

  function startLiveUpdates() {

    if (
      leaderboardTimer
    ) {

      clearInterval(
        leaderboardTimer
      );
    }


    leaderboardTimer =
      setInterval(
        () => {

          /*
           * Don't waste requests when the browser tab
           * isn't visible.
           */
          if (
            document.hidden
          ) {
            return;
          }


          loadLeaderboard();

        },
        LEADERBOARD_INTERVAL
      );
  }


  /* ==========================================================
     LIVE TEST LIST
     ========================================================== */

  function startTestListUpdates() {

    if (
      testsTimer
    ) {

      clearInterval(
        testsTimer
      );
    }


    testsTimer =
      setInterval(
        () => {

          if (
            document.hidden
          ) {
            return;
          }


          loadTests(true);

        },
        TESTS_INTERVAL
      );
  }


  /* ==========================================================
     TAB VISIBILITY
     ========================================================== */

  function bindVisibilityRefresh() {

    if (
      document.__lbVisibilityBound
    ) {
      return;
    }


    document.__lbVisibilityBound =
      true;


    document.addEventListener(
      'visibilitychange',
      () => {

        if (
          document.hidden
        ) {
          return;
        }


        /*
         * When the user returns to the leaderboard,
         * immediately get fresh data rather than waiting
         * for the 10-second timer.
         */
        loadTests(true);

        loadLeaderboard({
          showLoading: false
        });

      }
    );
  }


  /* ==========================================================
     AUTH CHANGES
     ========================================================== */

  function bindAuthListener() {

    if (
      !sb ||
      sb.__lbAuthBound
    ) {
      return;
    }


    sb.__lbAuthBound =
      true;


    sb.auth.onAuthStateChange(
      (_event, session) => {

        /*
         * Let Supabase finish updating local auth state.
         */
        setTimeout(
          () => {

            if (!session) {

              const box =
                $('#lbBody');


              if (box) {

                box.dataset.hasLeaderboard =
                  'false';
              }


              setMessage(
                'Sign in to view the leaderboard.'
              );


              return;
            }


            loadTests(false);

            loadLeaderboard({
              showLoading: true
            });

          },
          150
        );
      }
    );
  }


  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  async function init() {

    if (initialized) {
      return;
    }


    const client =
      window.mock1807Auth?.client;


    /*
     * auth.js may not have initialized yet.
     */
    if (!client) {

      setTimeout(
        init,
        250
      );

      return;
    }


    sb =
      client;


    initialized =
      true;


    console.log(
      '[Leaderboard] Initialized'
    );


    bindRefresh();

    bindVisibilityRefresh();

    bindAuthListener();


    /*
     * Initial data.
     */
    await loadTests(false);

    await loadLeaderboard({
      showLoading: true
    });


    /*
     * Start live systems.
     */
    startLiveUpdates();

    startTestListUpdates();

  }


  /* ==========================================================
     CLEANUP
     ========================================================== */

  function cleanup() {

    if (
      leaderboardTimer
    ) {

      clearInterval(
        leaderboardTimer
      );

      leaderboardTimer =
        null;
    }


    if (
      testsTimer
    ) {

      clearInterval(
        testsTimer
      );

      testsTimer =
        null;
    }
  }


  window.addEventListener(
    'beforeunload',
    cleanup
  );


  /* ==========================================================
     BOOT
     ========================================================== */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }


})();
