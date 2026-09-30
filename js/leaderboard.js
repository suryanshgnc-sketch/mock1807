/* MDCCCVII TESTS — Leaderboard
   Frontend-only fix.
   Uses the existing public.get_leaderboard(bigint) RPC.
*/

'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);

  let sb = null;
  let tests = [];
  let selectedTest = 'all';
  let initialized = false;

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

  const formatScore = (value) => {
    const n = Number(value);

    if (!Number.isFinite(n)) return '0';

    return Number.isInteger(n)
      ? String(n)
      : n.toFixed(1);
  };

  const formatTime = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0);

    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const initials = (name) => {
    const clean = String(name || 'Student').trim();

    return clean
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const avatar = (row) => {
    if (row.photo_url) {
      return `
        <img
          class="lb-av"
          src="${esc(row.photo_url)}"
          alt=""
          referrerpolicy="no-referrer"
        >
      `;
    }

    return `<span class="lb-av">${initials(row.name)}</span>`;
  };


  /* ---------------------------------------------------------
     Empty / loading / error states
     --------------------------------------------------------- */

  function setMessage(message, type = '') {
    const box = $('#lbBody');

    if (!box) return;

    box.innerHTML = `
      <div class="bt-empty ${type ? `bt-${type}` : ''}">
        ${esc(message)}
      </div>
    `;
  }


  /* ---------------------------------------------------------
     Render leaderboard
     --------------------------------------------------------- */

  function render(rows) {
    const box = $('#lbBody');

    if (!box) return;

    if (!Array.isArray(rows) || rows.length === 0) {
      setMessage(
        'No ranked attempts yet. Complete a test and check your answers to appear here.'
      );
      return;
    }

    const normalized = rows
      .map((row, index) => ({
        ...row,
        rank: Number(row.rank) || index + 1,
        score: Number(row.score) || 0,
        max_score: Number(row.max_score) || 0,
        correct_count: Number(row.correct_count) || 0,
        time_taken_seconds: Number(row.time_taken_seconds) || 0,
        is_me: Boolean(row.is_me)
      }))
      .sort((a, b) => a.rank - b.rank);

    const top = normalized.slice(0, 3);
    const me = normalized.find((row) => row.is_me);

    const podium = [
      top[1],
      top[0],
      top[2]
    ]
      .filter(Boolean)
      .map(
        (row) => `
          <div class="pod p${Math.min(row.rank, 3)}">
            <span class="pod-rank">${row.rank}</span>
            ${avatar(row)}
            <b>
              ${esc(row.name)}
              ${row.is_me ? ' (You)' : ''}
            </b>
            <em>
              ${formatScore(row.score)}
              <small>/${formatScore(row.max_score)}</small>
            </em>
          </div>
        `
      )
      .join('');

    const percentile =
      normalized.length <= 1 || !me
        ? me
          ? 100
          : 0
        : Math.round(
            ((normalized.length - me.rank) /
              (normalized.length - 1)) *
              100
          );

    box.innerHTML = `
      ${
        me
          ? `
            <div class="lb-me">
              <div>
                <small>Your rank</small>
                <b>#${me.rank}</b>
              </div>

              <div>
                <small>Score</small>
                <b>
                  ${formatScore(me.score)}
                  /
                  ${formatScore(me.max_score)}
                </b>
              </div>

              <div>
                <small>Percentile</small>
                <b>${percentile}</b>
              </div>

              <div>
                <small>Ranked students</small>
                <b>${normalized.length}</b>
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
          <span>Rank</span>
          <span>Student</span>
          <span>Score</span>
          <span>Correct</span>
          <span>Time</span>
        </div>

        ${normalized
          .slice(0, 25)
          .map(
            (row) => `
              <div class="lb-row${row.is_me ? ' me' : ''}">

                <span class="lb-rk">
                  ${row.rank}
                </span>

                <span class="lb-st">
                  ${avatar(row)}
                  ${esc(row.name)}
                  ${row.is_me ? ' <i>You</i>' : ''}
                </span>

                <span>
                  <b>${formatScore(row.score)}</b>
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
            `
          )
          .join('')}

      </div>
    `;
  }


  /* ---------------------------------------------------------
     Load leaderboard
     --------------------------------------------------------- */

  async function loadLeaderboard() {
    const box = $('#lbBody');

    if (!box || !sb) return;

    setMessage('Loading rankings…');

    try {
      /*
       * Get the current browser session.
       */
      const {
        data: sessionData,
        error: sessionError
      } = await sb.auth.getSession();

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

      if (!sessionData?.session) {
        setMessage(
          'Sign in to view the leaderboard.'
        );

        return;
      }


      /*
       * IMPORTANT:
       * Convert "all" to an actual null.
       * For a selected test, send a BIGINT-compatible number.
       */
      const testId =
        selectedTest === 'all'
          ? null
          : Number(selectedTest);


      if (
        selectedTest !== 'all' &&
        !Number.isSafeInteger(testId)
      ) {
        console.error(
          '[Leaderboard] Invalid test ID:',
          selectedTest
        );

        setMessage(
          'Invalid test selection.',
          'error'
        );

        return;
      }


      console.log(
        '[Leaderboard] Loading:',
        testId === null
          ? 'overall'
          : `test ${testId}`
      );


      const {
        data,
        error
      } = await sb.rpc(
        'get_leaderboard',
        {
          p_test_id: testId
        }
      );


      if (error) {
        console.error(
          '[Leaderboard] RPC error:',
          error
        );

        setMessage(
          error.message ||
            'Rankings are not available right now.',
          'error'
        );

        return;
      }


      console.log(
        '[Leaderboard] Rows received:',
        Array.isArray(data)
          ? data.length
          : 0
      );

      console.log(
        '[Leaderboard] Data:',
        data
      );


      render(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {
      console.error(
        '[Leaderboard] Unexpected error:',
        error
      );

      setMessage(
        'Something went wrong while loading rankings.',
        'error'
      );
    }
  }


  /* ---------------------------------------------------------
     Load available tests
     --------------------------------------------------------- */

  async function loadTests() {
    if (!sb) return;

    try {
      const {
        data,
        error
      } = await sb
        .from('tests')
        .select(
          'id,name,release_at,leaderboard_enabled'
        )
        .eq('enabled', true)
        .eq('leaderboard_enabled', true)
        .order('release_at', {
          ascending: false
        });

      if (error) {
        console.error(
          '[Leaderboard] Test list error:',
          error
        );

        return;
      }

      const now = Date.now();

      tests = (data || []).filter((test) => {
        if (!test.release_at) return true;

        const release = new Date(
          test.release_at
        ).getTime();

        return !Number.isNaN(release) &&
          release <= now;
      });


      const selector = $('#lbSel');

      if (!selector) return;


      selector.innerHTML = `
        <option value="all">
          Overall
        </option>

        ${tests
          .map(
            (test) => `
              <option value="${esc(test.id)}">
                ${esc(test.name)}
              </option>
            `
          )
          .join('')}
      `;


      /*
       * Preserve current selection if possible.
       */
      const exists = [
        'all',
        ...tests.map((test) =>
          String(test.id)
        )
      ].includes(String(selectedTest));

      selector.value = exists
        ? String(selectedTest)
        : 'all';

      selectedTest = selector.value;


      selector.onchange = () => {
        selectedTest = selector.value;

        loadLeaderboard();
      };

    } catch (error) {
      console.error(
        '[Leaderboard] Unexpected test-list error:',
        error
      );
    }
  }


  /* ---------------------------------------------------------
     Refresh button
     --------------------------------------------------------- */

  function bindRefresh() {
    const button = $('#lbRefresh');

    if (!button || button.__lbBound) {
      return;
    }

    button.__lbBound = true;

    button.addEventListener(
      'click',
      () => {
        loadLeaderboard();
      }
    );
  }


  /* ---------------------------------------------------------
     Initialise
     --------------------------------------------------------- */

  function init() {

    if (initialized) return;

    const client =
      window.mock1807Auth?.client;

    if (!client) {
      setTimeout(init, 250);
      return;
    }

    sb = client;
    initialized = true;

    bindRefresh();

    /*
     * Initial load.
     */
    Promise
      .resolve()
      .then(() => loadTests())
      .then(() => loadLeaderboard());


    /*
     * Re-load when authentication changes.
     */
    sb.auth.onAuthStateChange(
      (_event, session) => {

        setTimeout(() => {

          if (!session) {
            setMessage(
              'Sign in to view the leaderboard.'
            );

            return;
          }

          loadTests()
            .then(() => loadLeaderboard());

        }, 100);
      }
    );
  }


  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();
