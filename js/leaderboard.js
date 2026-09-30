/* ============================================================
   MDCCCVII TESTS — LEADERBOARD
   ------------------------------------------------------------
   • Overall leaderboard
   • Separate leaderboard for each test
   • Best attempt per student is handled by SQL RPC
   • Live refresh every 10 seconds
   • Refresh on tab return
   • Manual refresh
   • Works with existing HTML:
       #lbSel
       #lbRefresh
       #lbBody
   ============================================================ */

'use strict';

(() => {

  const $ = (selector) =>
    document.querySelector(selector);


  /* ==========================================================
     STATE
     ========================================================== */

  let sb = null;

  let tests = [];

  let selectedTest = 'all';

  let initialized = false;

  let liveTimer = null;

  let loading = false;


  const LIVE_INTERVAL = 10000;


  /* ==========================================================
     ESCAPE HTML
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
     FORMAT SCORE
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


  /* ==========================================================
     FORMAT TIME
     ========================================================== */

  const formatTime = (seconds) => {

    const s =
      Math.max(
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
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
  };


  /* ==========================================================
     INITIALS
     ========================================================== */

  const initials = (name) => {

    const clean =
      String(
        name || 'Student'
      ).trim();


    if (!clean) {
      return 'ST';
    }


    return clean
      .split(/\s+/)
      .map(
        (part) =>
          part[0]
      )
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
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
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
     RENDER LEADERBOARD
     ========================================================== */

  function render(rows) {

    const box =
      $('#lbBody');


    if (!box) {
      return;
    }


    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {

      setMessage(
        'No ranked attempts yet. Complete a test and submit it to appear here.'
      );

      return;
    }


    const normalized =
      rows
        .map(
          (row, index) => ({

            ...row,

            rank:
              Number(row.rank) ||
              index + 1,

            score:
              Number(row.score) || 0,

            max_score:
              Number(row.max_score) || 0,

            correct_count:
              Number(row.correct_count) || 0,

            time_taken_seconds:
              Number(
                row.time_taken_seconds
              ) || 0,

            /*
             * Supabase normally returns a real boolean.
             */
            is_me:
              row.is_me === true ||
              row.is_me === 'true'

          })
        )
        .sort(
          (a, b) =>
            a.rank - b.rank
        );


    /* ========================================================
       TOP 3
       ======================================================== */

    const top =
      normalized.slice(0, 3);


    const first =
      top[0] || null;

    const second =
      top[1] || null;

    const third =
      top[2] || null;


    /* ========================================================
       CURRENT USER
       ======================================================== */

    const me =
      normalized.find(
        (row) =>
          row.is_me
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


    /* ========================================================
       PODIUM
       ======================================================== */

    const podiumRows =
      [
        second,
        first,
        third
      ];


    const podium =
      podiumRows
        .filter(Boolean)
        .map(
          (row) => `
            <div class="pod p${Math.min(row.rank, 3)}">

              <span class="pod-rank">
                ${row.rank}
              </span>

              ${avatar(row)}

              <b>
                ${esc(
                  row.name ||
                  'Student'
                )}

                ${
                  row.is_me
                    ? ' (You)'
                    : ''
                }
              </b>

              <em>
                ${formatScore(row.score)}
                <small>
                  /
                  ${formatScore(row.max_score)}
                </small>
              </em>

            </div>
          `
        )
        .join('');


    /* ========================================================
       TABLE
       ======================================================== */

    const table =
      normalized
        .slice(0, 50)
        .map(
          (row) => `

            <div
              class="lb-row${row.is_me ? ' me' : ''}"
            >

              <span class="lb-rk">

                ${
                  row.rank === 1
                    ? '🥇 '
                    : row.rank === 2
                      ? '🥈 '
                      : row.rank === 3
                        ? '🥉 '
                        : ''
                }

                ${row.rank}

              </span>


              <span class="lb-st">

                ${avatar(row)}

                <span>
                  ${esc(
                    row.name ||
                    'Student'
                  )}

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
                ${formatTime(
                  row.time_taken_seconds
                )}
              </span>

            </div>

          `
        )
        .join('');


    /* ========================================================
       FINAL UI
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


      <div class="podium">

        ${podium}

      </div>


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


        ${table}

      </div>

    `;
  }


  /* ==========================================================
     GET SELECTED TEST
     ========================================================== */

  function getTestId() {

    if (
      selectedTest === 'all' ||
      selectedTest === '' ||
      selectedTest == null
    ) {

      return null;
    }


    const id =
      Number(selectedTest);


    if (
      !Number.isSafeInteger(id)
    ) {

      return undefined;
    }


    return id;
  }


  /* ==========================================================
     LOAD LEADERBOARD
     ========================================================== */

  async function loadLeaderboard(
    showLoading = true
  ) {

    const box =
      $('#lbBody');


    if (
      !box ||
      !sb
    ) {
      return;
    }


    /*
     * Prevent overlapping requests.
     */
    if (loading) {
      return;
    }


    loading = true;


    if (showLoading) {

      setMessage(
        'Loading rankings…'
      );
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
          sessionError.message ||
          'Could not verify your session.',
          'error'
        );


        return;
      }


      if (
        !sessionData ||
        !sessionData.session
      ) {

        setMessage(
          'Sign in to view the leaderboard.'
        );


        return;
      }


      /* ------------------------------------------------------
         TEST ID
         ------------------------------------------------------ */

      const testId =
        getTestId();


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
          '[Leaderboard] RPC ERROR:',
          error
        );


        setMessage(
          error.message ||
          'Leaderboard could not be loaded.',
          'error'
        );


        return;
      }


      console.log(
        '[Leaderboard] Received:',
        data
      );


      render(
        Array.isArray(data)
          ? data
          : []
      );


    } catch (error) {

      console.error(
        '[Leaderboard] ERROR:',
        error
      );


      setMessage(
        error?.message ||
        'Something went wrong while loading rankings.',
        'error'
      );


    } finally {

      loading = false;
    }
  }


  /* ==========================================================
     LOAD TESTS
     ========================================================== */

  async function loadTests() {

    if (!sb) {
      return;
    }


    try {

      /*
       * IMPORTANT:
       *
       * We intentionally keep this query almost identical
       * to the working backend-tests.js query.
       *
       * No extra .or() filters.
       */

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
          .order(
            'release_at',
            {
              ascending: false
            }
          );


      if (error) {

        /*
         * VERY IMPORTANT:
         *
         * Even if test discovery fails,
         * the Overall leaderboard should still work.
         */

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

              if (
                test.archived === true
              ) {
                return false;
              }


              /*
               * No release time =
               * immediately available.
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


              return (
                !Number.isNaN(release) &&
                release <= now
              );
            }
          );


      const selector =
        $('#lbSel');


      if (!selector) {
        return;
      }


      /* ------------------------------------------------------
         Remember previous selection
         ------------------------------------------------------ */

      const previous =
        selectedTest;


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


      const valid =
        [
          'all',
          ...tests.map(
            (test) =>
              String(test.id)
          )
        ];


      if (
        valid.includes(
          String(previous)
        )
      ) {

        selectedTest =
          String(previous);

      } else {

        selectedTest =
          'all';
      }


      selector.value =
        selectedTest;


      /* ------------------------------------------------------
         Change event
         ------------------------------------------------------ */

      if (
        !selector.__leaderboardBound
      ) {

        selector.__leaderboardBound =
          true;


        selector.addEventListener(
          'change',
          () => {

            selectedTest =
              selector.value ||
              'all';


            loadLeaderboard(
              true
            );

          }
        );
      }


    } catch (error) {

      console.error(
        '[Leaderboard] Test loading exception:',
        error
      );
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
      button.__leaderboardBound
    ) {
      return;
    }


    button.__leaderboardBound =
      true;


    button.addEventListener(
      'click',
      async () => {

        if (
          button.dataset.busy === '1'
        ) {
          return;
        }


        button.dataset.busy =
          '1';


        const old =
          button.innerHTML;


        button.innerHTML =
          'Refreshing…';


        try {

          await loadTests();

          await loadLeaderboard(
            false
          );

        } finally {

          button.dataset.busy =
            '0';

          button.innerHTML =
            old;
        }
      }
    );
  }


  /* ==========================================================
     LIVE REFRESH
     ========================================================== */

  function startLiveRefresh() {

    if (liveTimer) {

      clearInterval(
        liveTimer
      );
    }


    liveTimer =
      setInterval(
        () => {

          /*
           * Don't make requests when the page
           * is in another browser tab.
           */

          if (
            document.hidden
          ) {
            return;
          }


          loadLeaderboard(
            false
          );

        },
        LIVE_INTERVAL
      );
  }


  /* ==========================================================
     REFRESH WHEN RETURNING TO TAB
     ========================================================== */

  function bindVisibility() {

    if (
      document.__leaderboardVisibilityBound
    ) {
      return;
    }


    document.__leaderboardVisibilityBound =
      true;


    document.addEventListener(
      'visibilitychange',
      () => {

        if (
          document.hidden
        ) {
          return;
        }


        loadTests();

        loadLeaderboard(
          false
        );
      }
    );
  }


  /* ==========================================================
     AUTH STATE
     ========================================================== */

  function bindAuth() {

    if (
      !sb ||
      sb.__leaderboardAuthBound
    ) {
      return;
    }


    sb.__leaderboardAuthBound =
      true;


    sb.auth.onAuthStateChange(
      (_event, session) => {

        setTimeout(
          () => {

            if (!session) {

              setMessage(
                'Sign in to view the leaderboard.'
              );

              return;
            }


            loadTests()
              .then(
                () =>
                  loadLeaderboard(
                    true
                  )
              );

          },
          150
        );
      }
    );
  }


  /* ==========================================================
     INIT
     ========================================================== */

  function init() {

    if (initialized) {
      return;
    }


    const client =
      window.mock1807Auth?.client;


    /*
     * auth.js creates the Supabase client.
     * Wait if it hasn't happened yet.
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
      '[Leaderboard] MDCCCVII leaderboard initialized'
    );


    bindRefresh();

    bindVisibility();

    bindAuth();


    /*
     * Load the selector first,
     * then the leaderboard.
     */

    loadTests()
      .finally(
        () =>
          loadLeaderboard(
            true
          )
      );


    /*
     * Start live updates.
     */

    startLiveRefresh();
  }


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
