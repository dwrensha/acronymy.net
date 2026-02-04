import { bounce_if_not_authed, authorization_header_validates_as_admin } from "./auth.js";
import * as external from "./external.js";
import ABOUT_HTML from "./about.html";

const LEADERBOARD_KEY = "leaderboard";

async function render_leaderboard(env, db) {
  let leaderboard_obj = JSON.parse(await env.META.get(LEADERBOARD_KEY));
  if (leaderboard_obj == null) {
    let stmt = db.prepare(
      `select
         case
           when original_timestamp is null then author
           else original_author
         end as leaderboard_author,
         count(*) as count
       from (select * from defs left join defs_log
             where defs.def_id = defs_log.rowid)
       where not leaderboard_author is null
       group by leaderboard_author
       order by count DESC, timestamp DESC LIMIT 40;`);
    const result = await stmt.all();
    let leaderboard_array = result.results;
    leaderboard_obj = {
      timestamp: Date.now(),
      rows: leaderboard_array
    };
    await env.META.put(LEADERBOARD_KEY, JSON.stringify(leaderboard_obj));

    //{expirationTtl: 60 * 60 * 4})
  }
  let timestamp = (new Date(leaderboard_obj.timestamp)).toUTCString();
  let response = "<div class='leaderboard full-width'>";
  response += `<h2><a href="/">Acronymy</a> Leaderboard</h2>`;
  //response += `<div class='timestamp'>(as of ${timestamp})</div>`;
  response += "<div class='leaderboard-holder'><table>";
  response += "<thead><tr><th></th><th>author</th><th>defs</th></tr></thead>";
  response += "<tbody>"
  for (let ii = 0; ii < leaderboard_obj.rows.length; ++ii) {
    let row = leaderboard_obj.rows[ii];
    response += `<tr><td>${ii + 1}</td><td>${row.leaderboard_author}</td><td>${row.count}</td></tr>`;
  }
  response += "</tbody></table></div>"
  response += "<div>";

  return response;
}

async function render_home_page(env) {
  let raw_status = await env.META.get(STATUS_KEY);
  let status;
  if (!raw_status) {
    console.log("no status");
    status = await refresh_status(env);
    console.log("status = ", status);
  } else {
    status = JSON.parse(raw_status);
  }

  let word_of_the_day = status.word_of_the_day;
  let word_of_the_day_def = status.word_of_the_day_def;
  let timestamp = new Date(status.timestamp);
  let percent = (100 * status.num_defined / status.total_num_words).toFixed(4);

  let wotd =
      `Today's word is <b><a href="/define/${word_of_the_day}">${word_of_the_day}</a></b>:`;
  wotd += `<div class="wotd-def">"`;
  let ii = 0;
  for (let def_word of word_of_the_day_def.split(" ")) {
    if (ii++ != 0) { wotd += " "; }
    wotd += "<b>" + def_word[0] + "</b>" + def_word.slice(1);
  }
  wotd += `"</div>`;

  let response_string = `<div class=\"title\">Acronymy</div>
<div class="catchphrase">Can we define every word as an acronym?</div>
<div class="status full-width">
<div class="progress-bar"
     title="So far, we have defined ${status.num_defined} words out of ${status.total_num_words}.">
 <div class="progress-bar-total">
   <div class="progress-bar-done" style="width:${percent}%"> </div>
 </div>
</div>
<div class="progress-bar-caption">
${status.num_defined} out of ${status.total_num_words} (${percent}%)</div>
<ul class="wotd-and-recents">
<li class="wotd">${wotd}
</li>
<li class="recents">Recent edits: `
  for (let ii = 0; ii < status.recently_defined.length; ++ii) {
    let w = status.recently_defined[ii];
    response_string += `<a href="/define/${w}">${w}</a>`;
    if (ii + 1 < status.recently_defined.length) {
      response_string += ", ";
    }
  }
  response_string += `.</li>`;
  response_string += `</ul>`;
  response_string += '<div class="feeling-lucky full-width">'
  response_string += `<a class="lucky-link" href="/random">random defined word</a>
                        <a class="lucky-link" href="/random-todo">random undefined word</a>`;
  response_string += "</div>"
  response_string +=
   `<div class="social-links">
     Follow <a href="https://bsky.app/profile/acronymy.net">@acronymy.net</a> &amp; <a href="https://bsky.app/profile/daily.acronymy.net">@daily.acronymy.net</a>.
   </div>`;

  response_string += `<div class="leaderboard-link">
                      <span>🏆 <a href="/leaderboard">Leaderboard</a> 🏆</span></div>`;
  response_string += `</div>`;

  return response_string;
}

function header(title) {
  return `<!DOCTYPE html><html><head> <meta name="viewport" content="width=device-width">
   <title>${title}</title><link rel="stylesheet" type="text/css" href="/main.css" >
   <link rel="icon" type="image/svg+xml" href="/favicon.svg">
   </head><body>`;
}

function define_form(word, initial_value) {
  let maybe_value = "";
  if (initial_value) {
    maybe_value = `value="${initial_value}"`;
  }
  return `<div class="definition-form full-width">
          <form action="/define/${word}" method="post">
          <input name=\"definition\" maxlength=\"2000\" placeholder="enter new definition" class="definition-input-text" ${maybe_value} autofocus required/>
          <br>
          <button>submit</button></form>
          </div>`;
}

function suggest_word_form(initial_word, initial_definition) {
  let maybe_word_value = initial_word ? `value="${initial_word}"` : "";
  let maybe_def_value = initial_definition ? `value="${initial_definition}"` : "";
  return `<div class="suggest-word-form full-width">
          <form action="/suggest-word" method="post">
          <input name=\"new-word\" maxlength=\"30\" placeholder="new word" class="new-word-input-text" ${maybe_word_value} ${initial_word ? "" : "autofocus"} required/>
          <input name=\"definition\" maxlength=\"2000\" placeholder="definition" class="definition-input-text" ${maybe_def_value} ${initial_word ? "autofocus" : ""} required/>
          <br>
          <button>submit</button></form>
          </div>`;
}

function render_footer(options, home_or_about, login_redirect) {
  let entered_word = "";
  if (options.entered_word) {
    entered_word = `value="${options.entered_word}"`;
  }
  let autofocus_define = options.autofocus_define ? "autofocus" : "";

  let result = `\n<div class="footer full-width"><hr><div class="footer-row">`;
  result += `<form action="/define" method="get">`;
  result += `<input name="word" maxlength="100" size="15" `;
  result +=  `placeholder="enter word" ${entered_word} ${autofocus_define} required/>`;
  result += `<button>look up</button></form>`;
  result += home_or_about;

  if (options.username) {
    result += `<form class="logged-in" action="/logout"><span>logged in as ${options.username}</span>`;
    result += `<input name=\"redirect\" value=\"${login_redirect}\" type=\"hidden\"/>`;
    result += `<button>log out</button></form>`
  } else {
    result +=
      `<form action="/login"><input name="username" placeholder="username" size="10" required/>`;
    result += `<input name=\"redirect\" value=\"${login_redirect}\" type=\"hidden\"/>`;
    result += `<button>log in</button>`;
  }
  result += `</form></div></div>`;
  return result;
}

function render_home_footer(maybe_username, req) {
  // HACK: if the user agent indicates that we're on mobile, then
  // don't add the autofocus.
  const user_agent = req.headers.get('user-agent') || '';
  const is_mobile = /Mobile|Android|iP(hone|ad|od)|IEMobile|BlackBerry|Opera Mini/i.test(user_agent);
  return render_footer({"username" : maybe_username, "autofocus_define": !is_mobile},
                       `<a class="about-link" href="/about">about</a>`,
                       "/");
}

function render_about_footer(maybe_username) {
  return render_footer({"username" : maybe_username},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       "/about");
}

function render_leaderboard_footer(maybe_username) {
  return render_footer({"username" : maybe_username},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       "/leaderboard");
}

function render_not_found_footer(maybe_username) {
  return render_footer({"username" : maybe_username},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       "/");
}

function render_def_footer(word, maybe_username, maybe_entered_word) {
  return render_footer({"username" : maybe_username, entered_word: maybe_entered_word},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       "/define/" + word);
}

const STATUS_KEY = "status";

async function is_word(query, env) {
  if (query.length == 0) return false;
  const db = env.DB;
  let stmt = db.prepare("SELECT word FROM words WHERE word = ?1;").bind(query);
  const result = await stmt.all();
  if (result.results.length > 0) {
    return true;
  } else {
    return false;
  }
}

// returns either `{valid: true}` or
// {invalid: true, reason: <string> }.
async function validate_definition(def, word, env) {
  if (def.length != word.length) {
    return {
      invalid: true,
      reason: `definition has length ${def.length}, but word has length ${word.length}`
    };
  }
  let idx = 0;
  let def_promises = [];
  for (let def_word of def) {
    let match = def_word.match(/[^a-zA-Z\s]/);
    if (match) {
      return {
        invalid: true,
        reason: `invalid character: '${match}'`
      };
    }
    def_promises.push(is_word(def_word, env));
  }
  let defs = await Promise.all(def_promises);
  for (let ii = 0; ii < def.length; ++ii) {
    let def_word = def[ii];
    let def_word_def = defs[ii];
    if (!def_word_def) {
      return {
        invalid: true,
        reason: `${def_word} is not in the word list.
                 (Should we <a href="/suggest-word?word=${def_word}">add it</a>?)`
      };
    }
    if (def_word[0] != word[idx]) {
      return {
        invalid: true,
        reason: `${def_word} does not start with ${word[idx]}`
      };
    }
    idx += 1;
  }

  return {valid: true};
}

async function send_daily_updates(env) {
  const word_of_the_day = await choose_new_word_of_the_day(env);
  const status = await refresh_status(env);

  // send @daily_acronymy toot
  let word_of_the_day_def = await env.WORDS.get(word_of_the_day);
  let percent = (100 * status.num_defined/status.total_num_words).toFixed(3);
  let capitalized_def = word_of_the_day_def.split(' ').map(
    str => str.charAt(0).toUpperCase() + str.slice(1)).join(' ');
  let prefix = `The acronym of the day is ${word_of_the_day.toUpperCase()}:\n\n` +
      capitalized_def + "\n\n"+
      "---\n\n" +
      `To submit a new definition for this word, visit `;

  const link_text = `acronymy.net/define/${word_of_the_day}`;
  const link_uri = `https://acronymy.net/define/${word_of_the_day}`;
  let suffix =
      `\n\nSo far, ${status.num_defined} out of ${status.total_num_words} `+
      `words have been defined (${percent}%).`;
  // Mastodon does automatic linkification if we include the 'https://'.
  let toot_text = prefix + link_uri + suffix;

  const p1 =
        external.send_toot(env.MASTODON_URL, env.DAILY_UPDATE_MASTODON_TOKEN, toot_text, "public")
        .catch(e => console.error("error tooting daily update: ", e));

  // In Bluesky, we manually linkify via 'facets', so we drop the 'https://' in the text.
  let bloot_text = prefix + link_text + suffix;
  const record = {
    "text": bloot_text,
    "facets" : [{
      index : { byteStart: prefix.length,
                byteEnd: prefix.length + link_text.length },
      features : [{
        '$type': 'app.bsky.richtext.facet#link',
        uri: link_uri
      }]
    }],
    "createdAt": (new Date()).toISOString(),
    "$type": "app.bsky.feed.post"
  };

  const DID = "did:plc:qazqvgjsbl7cucuu373w64nx" // @daily.acronymy.net
  const p2 = external.send_bloot(DID, env.BLUESKY_DAILY_PASSWORD, record)
        .catch(e => console.error("error posting daily bluesky update: ", e));
  await Promise.all([p1, p2]);
}

async function toot_admin_notification(env, toot_text) {
  return external.send_toot(env.MASTODON_URL, env.ADMIN_NOTIFICATIONS_MASTODON_TOKEN, toot_text, "private");
}

async function render_definition(env, word, definition, metadata) {
  let response_string = "";
  if (definition) {
    let def_words = definition.split(" ");
    let def_promises = [];
    for (let def_word of def_words) {
      def_promises.push(env.WORDS.get(def_word));
    }
    let defs = await Promise.all(def_promises);

    response_string += `<div class="definition">`
    for (let ii = 0; ii < def_words.length; ++ii){
      let def_word = def_words[ii];
      let def_word_def = defs[ii];
      let not_defined_class="";
      if (!def_word_def) {
        not_defined_class = `class="not-defined"`;
      }
      response_string += ` <a href="/define/${def_word}" ${not_defined_class}>${def_word}</a> `;
    }
    response_string += "</div>";
    response_string += `<div class="attribution">`;
    if (metadata && metadata.time) {
      let time = new Date(metadata.time);
      response_string += `—defined ${time.toUTCString()}`;
      if (metadata.user) {
        response_string += ` by ${metadata.user}`;
      }
    } else {
      response_string += `—defined before the beginning of history (October 2022)`;
    }
    response_string += ` <a href="/history?word=${word}">[history]</a>`
    response_string += `</div>`;
  } else {
    response_string += "<div><i>this word has no definition yet</i></div>";
  }
  return response_string;
}

function render_suggestion_status(row) {
  const word = row.word;

  let suggestion_class = "suggestion-pending";
  let suggestion_status = `<div class="suggestion-status">`;
  if (row.status == 0) {
    suggestion_status += "<p>This suggested word is pending moderator approval.</p>";
  } else if (row.status > 0) {
    suggestion_class = "suggestion-accepted";
    suggestion_status += `<p>This suggested word <a href="/define/${word}">has been accepted!</a></p>`;
  } else if (row.status < 0) {
    suggestion_class = "suggestion-rejected";
    suggestion_status += `<p>This suggested word has been rejected.</p>`;
  }
  if (row.moderator_note) {
    suggestion_status += `<p> The moderator left a note: ${row.moderator_note}</p>`
  }
  suggestion_status += `</div>`;

  let word_class = "word";
  if (word.length > 15) {
    word_class = "word extra-long";
  }
  let response_string =
      `<div class=\"${word_class}\"><span class="${suggestion_class}">${word}</span></div>`;

  const definition = row.def;
  let def_words = definition.split(" ");
  response_string += `<div class="definition">`
  for (let ii = 0; ii < def_words.length; ++ii){
    let def_word = def_words[ii];
    response_string += ` ${def_word} `;
  }
  response_string += "</div>";
  response_string += `<div class="attribution">`;
  let time = new Date(row.timestamp);
  response_string += `—suggested ${time.toUTCString()}`;
  if (row.author) {
    response_string += ` by ${row.author}`;
  }
  response_string += `</div>`;

  response_string += suggestion_status;

  return response_string;
}

function render_error(title, message) {
  let response_string = "";
  response_string += `<div class="big-error">`;
  response_string += title;
  response_string += `</div>`;
  response_string += `<div class="err">`;
  response_string += message;
  response_string += `</div>`;
  return response_string;
}

// returns either `{valid: true}` or
// {invalid: true, reason: <string> }.
function validate_username(username) {
  if (!username) {
    return {invalid: true, reason: "username must be nonempty"};
  }
  if (!username.match(/^[0-9a-zA-Z]+$/)) {
    return {invalid: true, reason: "username must be alphanumeric"};
  }
  if (username.length > 20) {
    return {invalid: true, reason: "username must be at most 20 characters"};
  }
  return {valid: true};
}

async function update_def(req, env, word, definition, username, old_def, db) {
  let timestamp = Date.now();

  let metadata = {};

  let ratelimit_promise = Promise.resolve({"success": true});
  const ip = req && req.headers.get('cf-connecting-ip');
  if (ip && env.SUBMISSION_RATE_LIMITER) {
    ratelimit_promise = env.SUBMISSION_RATE_LIMITER.limit({ key: ip });
  }

  // First, check whether this is a restoration of an old definition.
  let stmt0 = db.prepare(
    "SELECT word, def, author, timestamp, original_author, original_timestamp FROM defs_log WHERE word = ?1 AND def = ?2 ORDER BY timestamp ASC LIMIT 1;");
  stmt0 = stmt0.bind(word, definition);

  const [result_ratelimit, result] =
        await Promise.all([ratelimit_promise, stmt0.first()]);
  if (!result_ratelimit["success"]) {
    return {error : {status : 429, message: "Rate limit exceeded."}};
  }
  let credit = { author: username, timestamp: timestamp };
  let is_restoration = false;
  if (result) {
    is_restoration = true;
    credit.restorer = username;
    if (result.original_timestamp == null) {
      credit.author = result.author;
      credit.timestamp = result.timestamp;
    } else {
      // The oldest entry in the log is a restoration.
      // Apparently the original was deleted somehow.
      credit.author = result.original_author;
      credit.timestamp = result.original_timestamp;
    }
  }
  // credit.author is the original author
  // credit.timestamp is the time of the original submission
  // credit.restorer is the restoring author
  //    (this key is not present if this is not a restoration)

  let stmt1 = db.prepare(
    "INSERT INTO defs_log (word, def, author, timestamp, original_author, original_timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6)");

  metadata['time'] = credit.timestamp;
  if (credit.author) {
    metadata['user'] = credit.author;
  }

  const original_author = is_restoration ? credit.author : null;
  const original_timestamp = is_restoration ? credit.timestamp : null;
  stmt1 = stmt1.bind(word, definition, username, timestamp,
                     original_author, original_timestamp);
  let stmt2 = db.prepare(
    "INSERT INTO defs (word, def_id) VALUES (?1, last_insert_rowid()) " +
      "ON CONFLICT (word) DO UPDATE SET def_id = excluded.def_id;");
  stmt2 = stmt2.bind(word);

  await db.batch([stmt1, stmt2]);

  let p3 = external.toot_submission(env, word, definition, credit).catch((e) => {
    console.log("error on toot attempt: ", e);
  });

  let p4 = external.bloot_submission(env, word, definition, credit).catch((e) => {
    console.log("error on bloot attempt: ", e);
  });

  let p5 = env.META.delete(LEADERBOARD_KEY);

  let p6 = external.post_def_to_discord(env, word, definition, credit, old_def).catch((e) => {
    console.log("error on posting to discord: ", e);
  });

  await Promise.all(
    [refresh_status(env),
     env.WORDS.put(word, definition, {metadata}),
     p3, p4, p5, p6]);

  return { success : true };
}

async function get_random_defined_word(env) {
  const db = env.DB;
  let stmt1 = db.prepare("SELECT max(rowid) as rowid FROM defs");
  const max_rowid = await stmt1.first('rowid');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let rowid = Math.floor(Math.random() * max_rowid) + 1;
    let stmt2 = db.prepare("SELECT word FROM defs WHERE rowid = ?1").bind(rowid);
    const word = await stmt2.first("word");
    if (word) {
      return word;
    }
  }
  return null;
}

async function get_random_undefined_word(env) {
  const db = env.DB;
  let stmt1 = db.prepare("SELECT max(rowid) as rowid FROM words");
  const max_rowid = await stmt1.first('rowid');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let rowid = Math.floor(Math.random() * max_rowid) + 1;
    let stmt2 = db.prepare("SELECT words.word, def_id from words " +
                           "LEFT JOIN defs ON words.word = defs.word " +
                           "WHERE words.rowid = ?1").bind(rowid);
    const result = await stmt2.first();
    if (result && !result.def_id) {
      // This word is not defined yet.
      return result.word;
    }
  }
  return null;
}

async function get_word_definition(env, word, db, defined_just_now) {
  if (defined_just_now == word) {
    // The user just defined the word, so we use D1, the primary datastore, to
    // look up the latest value. If we used KV instead (the faster default path),
    // then we would risk serving a stale cached value and confusing the user.
    let stmt = env.DB.prepare(
      `SELECT def, author, timestamp, original_author, original_timestamp from defs JOIN defs_log ON def_id = defs_log.rowid
       WHERE defs.word = ?1`).bind(word);
    const row = await stmt.first();
    if (!row) {
      return { value : null, metadata: null };
    }
    let metadata = {};
    if (row.original_timestamp != null) {
      metadata.time = row.original_timestamp;
      metadata.user = row.original_author;
    } else {
      metadata.time = row.timestamp;
      metadata.user = row.author;
    }
    return {
      value: row.def,
      metadata
    }
  } else {
    // The common case: use the faster KV cache.
    return await env.WORDS.getWithMetadata(word);
  }
}

function get_random_id() {
  let array = Array.from(self.crypto.getRandomValues(new Uint8Array(10)));
  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function insert_suggestion(env, word, definition, username) {
  const db = env.DB;
  let stmt1 = db.prepare(
    "INSERT INTO suggestions (id, word, def, author, timestamp, status) VALUES (?1, ?2, ?3, ?4, ?5, 0)");
  let timestamp = Date.now();

  let author = null;
  if (username && validate_username(username).valid) {
    author = username;
  }

  const id = get_random_id();
  stmt1 = stmt1.bind(id, word, definition, author, timestamp);
  await db.batch([stmt1]);
  const p1 = toot_admin_notification(
    env,
    `new suggestion: ${word} = ${definition}. https://acronymy.net/suggest-word-admin/${id}`)
        .catch((e) => { console.log("error tooting admin notification: " + e); });

  const p2 = external.post_to_discord(
    env,
    "1341784714092216395", // "suggested-words"
    `new suggestion: [${word}](https://acronymy.net/suggest-word-status/${id}) = ${definition}`)
        .catch((e) => { console.log("error posting word suggestion to discord: " + e); });
  await Promise.all([p1, p2]);

  return id;
}

async function handle_get(req, env) {
  let url = new URL(req.url);
  let username = null;
  let defined_just_now = null; // If non-null, the word the user just now submitted a definition for.
  let bookmark = "first-unconstrained"; // D1 bookmark
  if (req.headers.has('Cookie')) {
    for (let cookie of req.headers.get('Cookie').split(";")) {
      let components = cookie.split('=');
      let name = components[0].trim();
      if (name == 'username') {
        username = components[1];
        if (!validate_username(username).valid) {
          return new Response("invalid username", {status: 400});
        }
      } else if (name == 'd1-bookmark') {
        bookmark = components[1];
      } else if (name == 'defined-just-now') {
        defined_just_now = components[1];
      }
    }
  }
  let db = env.DB.withSession(bookmark);

  let response_string = header(" Acronymy ");
  let response_status = 200;
  if (url.pathname == "/define") {
    // Result of submitting the "look up" form.
    // Redirect to "/define/<word>".
    let word = url.searchParams.get('word');
    if (!word) {
      // Probably the user manually edited the URL. Send them to the homepage.
      return new Response("", {status: 302, headers: {'Location': `/`}});
    }
    let encoded_word = encodeURI(word.toLowerCase().trim());
    return new Response("",
                        {status: 302,
                         headers: {'Location': `/define/${encoded_word}`, }});
  } else if (url.pathname.startsWith("/define/")) {
    let word = url.pathname.slice("/define/".length);
    if (!word) {
      // Probably the user manually edited the URL. Send them to the homepage.
      return new Response("", {status: 302, headers: {'Location': `/`}});
    }
    response_string = header(` Acronymy - ${word} `);
    let { value, metadata } = await get_word_definition(env, word, db, defined_just_now);
    let definition = value;
    let input_starting_value = null;
    if (!definition && !(await is_word(word, env))) {
      let decoded_word = decodeURI(word);
      response_string +=
        render_error("Not Found",
                     `${decoded_word} is not in the word list.
                      (Should we <a href="/suggest-word?word=${decoded_word}">add it</a>?)`);
      response_string += render_def_footer(word, username, decoded_word);
      response_status = 404;
    } else {
      let word_class = "word";
      if (word.length > 15) {
        word_class = "word extra-long";
      }
      response_string += `<div class=\"${word_class}\">${word}</div>`;
      let error_message = null;
      let proposed_definition = null;
      if (req.method == "POST") {
        const form_data = await req.formData();
        for (const entry of form_data.entries()) {
          if (entry[0] == "definition") {
            proposed_definition = entry[1];
          }
        }
      }
      if (proposed_definition) {
        let def_words = proposed_definition.trim().toLowerCase().split(/\s+/);
        let validation_result = await validate_definition(def_words, word, env);
        if (validation_result.valid) {
          let new_def = def_words.join(" ");
          if (new_def != definition) {
            try {
              let result = await update_def(req, env, word, new_def, username, definition, db);
              if (result.success) {
                let bookmark = db.getBookmark();
                const headers = new Headers();
                headers.set('Location', `/define/${word}`);
                headers.append('Set-Cookie', `defined-just-now=${word}; Max-Age=60`);
                headers.append('Set-Cookie', `d1-bookmark=${bookmark}; Max-Age=600`);

                return new Response("",
                                    {status: 303,
                                     headers: headers});
              } else {
                let err = result.error;
                return new Response(err.message,
                                    { status: err.status});
              }
            } catch (e) {
              console.error(e);
              error_message = "<p>error occurred while attempting to write definition</p>";
            }
          }
        } else { // invalid definition
          error_message = validation_result.reason;
          response_status = 400;
          input_starting_value = def_words.join(" ");
        }
      }
      response_string += await render_definition(env, word, definition, metadata);
      response_string += define_form(word, input_starting_value);
      if (error_message) {
        response_string += `<div class="err"> ${error_message} </div>`;
      }
      response_string += render_def_footer(word, username);
    }
  } else if (url.pathname == "/login") {
    let location = url.searchParams.get('redirect') || "/";
    let username = url.searchParams.get('username') || "";
    let username_validation = validate_username(username);
    if (!username_validation.valid) {
      response_string += `<div class="err"> ${username_validation.reason} </div>`;
      response_string += `<a href="${location}">back</a>`;
    } else {
      return new Response("",
                          {status: 302,
                           headers: {
                             'Location': location,
                             'Set-Cookie':
                               `username=${username}; Max-Age=315360000; Path=/`}});
    }
  } else if (url.pathname == "/logout") {
    let location = url.searchParams.get('redirect') || "/";
    return new Response("",
                        {status: 302,
                         headers: {'Location': location,
                                   'Set-Cookie':
                                      `username=X; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`}});
  } else if (url.pathname == "/history") {
    let word = url.searchParams.get('word');
    if (!word) {
      return new Response("need to specify word", { status: 400 })
    }

    let stmt1 = db.prepare(
      "SELECT rowid, def, author, timestamp, original_author, original_timestamp FROM defs_log WHERE word = ?1 ORDER BY timestamp DESC");
    stmt1 = stmt1.bind(word);
    let db_result = await stmt1.all();
    let entries = db_result.results;

    response_string += `<div>history of definitions for
                        <a href="/define/${word}">${word}</a>:</div>`;
    response_string += `<div class="history full-width">`;
    response_string += "<table>";
    response_string += "<thead><tr></thead>";
    response_string += "<tbody>"
    for (let ii = 0; ii < entries.length; ++ii) {
      let entry = entries[ii];
      let author = entry.author;
      let timestamp = entry.timestamp;
      let is_restoration = false;
      if (entry.original_timestamp != null) {
        is_restoration = true;
        timestamp = entry.original_timestamp;
        author = entry.original_author;
      }
      response_string += `<tr><td class="restore-col">`;
      if (ii == 0) {
        response_string += `<span title="this is the current definition">✓</span>`;
      } else {
        if (entry.def == entries[0].def) {
          response_string += `<span title="this is the current definition">-</span>`;
        } else {
          response_string +=
            `<form action="/define/${word}" method="post" class='restore-form'>
           <input name=\"definition\" type="hidden" value="${entry.def}"> </input>
           <button title="Restore this definition. The original author will be credited.">
           restore</button>
           </form>`;
        }
        if (authorization_header_validates_as_admin(env.ADMIN_PASSWORD, req.headers.get("Authorization"))) {
          response_string +=
            `<form action="/expunge/${entry.rowid}" method="post" class='restore-form'>
             <button class="expunge-button">expunge</button>
             </form>`;
        }
      }
      response_string += `</td><td>`;
      response_string += `${entry.def}`;
      response_string += `<p class="history-attribution">`;
      if (!timestamp) {
        response_string += ` — defined before the beginning of history (October 2022)`;
      } else {
        let time = new Date(timestamp);
        response_string += ` — defined ${time.toUTCString()}`;
        if (author) {
          response_string += ` by ${author}`;
        }
      }
      if (is_restoration) {
        let time = new Date(entry.timestamp);
        response_string += `, <span class='restored'>restored ${time.toUTCString()}`
        if (entry.author) {
          response_string += ` by ${entry.author}`;
        }
        response_string += `</span>`;
      }
      response_string += `</p>`;
      response_string += `</td>`;
      response_string += `</tr>`
    }
    response_string += `</tbody></table></div>`;
    response_string += render_footer(
      {"username" : username},
      `<a class="home-link" href=\"/\">Acronymy</a>`,
      "/history?word=" + word);
  } else if (url.pathname == "/admin-login") {
    const bounce = bounce_if_not_authed(env, req);
    if (bounce) {
      return bounce;
    }
    return new Response("logged in", {status : 200});
/*  } else if (url.pathname.startsWith("/expunge/")) {
    const bounce = bounce_if_not_authed(env, req);
    if (bounce) {
      return bounce;
    }
    let rowid_string = url.pathname.slice("/expunge/".length);
    const rowid = parseInt(rowid_string, 10);
    console.log("rowid =", rowid);
    const db = env.DB;
    let stmt1 = db.prepare("DELETE from defs_log where rowid = ?1 RETURNING word;")
    stmt1 = stmt1.bind(rowid);
    const row = await stmt1.first();
    return new Response("", {status: 302, headers: {'Location': `/history?word=${row.word}`}});
*/
  } else if (url.pathname == "/about") {
    response_string += ABOUT_HTML;
    response_string += render_about_footer(username);
  } else if (url.pathname == "/leaderboard") {
    response_string += await render_leaderboard(env, db);
    response_string += render_leaderboard_footer(username);
  } else if (url.pathname == "/random") {
    const word = await get_random_defined_word(env);
    if (word) {
      return new Response("", {status: 302, headers: {'Location': `/define/${word}`}});
    } else {
      response_status = 500;
      response_string += render_error("Error", "Failed to select random word");
      response_string += render_not_found_footer(username);
    }
  } else if (url.pathname == "/random-todo") {
    const word = await get_random_undefined_word(env);
    if (word) {
      return new Response("", {status: 302, headers: {'Location': `/define/${word}`}});
    } else {
      response_status = 500;
      response_string += render_error("Error", "Failed to select random word");
      response_string += render_not_found_footer(username);
    }
  } else if (url.pathname == "/") {
    response_string += await render_home_page(env);
    response_string += render_home_footer(username, req);
  } else if (url.pathname == "/suggest-word") {
    response_string = header(` Acronymy - suggest word `);
    response_string += "<h3>suggest a new word</h3>"
    let error_message = null;
    let proposed_word = null;
    let proposed_definition = null;
    let input_starting_word = url.searchParams.get('word');
    let input_starting_definition = null;
    if (req.method == "POST") {
      const form_data = await req.formData();
      for (const entry of form_data.entries()) {
        if (entry[0] == "new-word") {
          proposed_word = entry[1].toLowerCase().trim();
        } else if (entry[0] == "definition") {
          proposed_definition = entry[1];
        }
      }
    }
    if (proposed_definition && proposed_word) {
      let def_words = proposed_definition.trim().toLowerCase().split(/\s+/);
      let new_def = def_words.join(" ");
      if (await is_word(proposed_word, env)) {
        error_message = `${proposed_word} is already in the word list`;
        response_status = 400;
        input_starting_word = proposed_word;
        input_starting_definition = new_def;
      } else {
        let validation_result = await validate_definition(def_words, proposed_word, env);
        if (validation_result.valid) {
          let id = await insert_suggestion(env, proposed_word, new_def, username);
          return new Response("",
                              {status: 303,
                               headers:
                               {'Location': `/suggest-word-status/${id}`}});
        } else { // invalid definition
          error_message = validation_result.reason;
          response_status = 400;
          input_starting_word = proposed_word;
          input_starting_definition = new_def;
        }
      }
    }
    response_string += suggest_word_form(input_starting_word, input_starting_definition);
    if (error_message) {
      response_string += `<div class="err"> ${error_message} </div>`;
    }
    response_string += render_footer({"username" : username},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       url.pathname + url.search);
  } else if (url.pathname.startsWith("/suggest-word-status/")) {
    response_string = header(` Acronymy - suggested word `);
    let id = url.pathname.slice("/suggest-word-status/".length);
    let stmt = db.prepare(
      "SELECT word, def, author, timestamp, status, moderator_note FROM suggestions WHERE id = ?1");
    stmt = stmt.bind(id);
    let db_result = await stmt.all();
    let entries = db_result.results;
    if (entries.length < 1) {
      response_status = 404;
      response_string += render_error("Not Found",
                                      `suggestion "${id}" was not found`);
      response_string += render_not_found_footer(username);
    } else {
      response_string += render_suggestion_status(entries[0]);
      response_string += render_footer({"username" : username},
                                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                                       `/suggest-word-status/${id}`);
    }
  } else if (url.pathname.startsWith("/suggest-word-admin/")) {
    const bounce = bounce_if_not_authed(env, req);
    if (bounce) {
      return bounce;
    }
    let id = url.pathname.slice("/suggest-word-admin/".length);

    let stmt = env.DB.prepare(
      "SELECT word, def, author, timestamp, status, moderator_note FROM suggestions WHERE id = ?1");
    stmt = stmt.bind(id);
    let db_result = await stmt.all();
    let entries = db_result.results;
    if (entries.length < 1) {
      response_status = 404;
      response_string += render_error("Not Found",
                                      `suggestion "${id}" was not found`);
      response_string += render_not_found_footer(username);
    } else {
      const row = entries[0];
      if (req.method == "POST") {
        const form_data = await req.formData();
        let status = 0;
        let note = null;
        for (const entry of form_data.entries()) {
          if (entry[0] == "action") {
            if (entry[1] == "accept") {
              status = 1;
            } else if (entry[1] == "reject") {
              status = -1;
            }
          } else if (entry[0] == "note") {
            note = entry[1];
          }
        }
        let stmt = db.prepare(
          "UPDATE suggestions SET status = ?1, moderator_note = ?2 WHERE id = ?3 AND status = 0");
        stmt = stmt.bind(status, note, id);
        let {results, success, meta} = await stmt.run();
        if (meta.changes == 1 && status == 1) {
          // The change happened and it added a word.
          let stmt3 = db.prepare(
            "INSERT INTO words (word) VALUES (?1)").bind(row.word);
          let stmt4 = db.prepare(
            "UPDATE status SET total_num_words = total_num_words + 1");
          await db.batch([stmt3, stmt4]);
          await update_def(null, env, row.word, row.def, row.author, null, db);
        }
        return new Response("",
                            {status: 303,
                             headers:
                             {'Location': `/suggest-word-admin/${id}`}});
      }
      response_string += render_suggestion_status(row);
      if (row.status == 0) {
        response_string += `<form action="/suggest-word-admin/${id}" method="post">
        <input type="radio" id="accept" name="action" value="accept">
        <label for="accept">Accept</label><br>
        <input type="radio" id="reject" name="action" value="reject">
        <label for="reject">Reject</label><br>`
        response_string += `<textarea name="note"></textarea>`
        response_string += `<button>submit</button></form>`
      }
    }
  } else {
    response_status = 404;
    response_string += render_error("Not Found",
                                    `"${url.pathname}" was not found`);
    response_string += render_not_found_footer(username);
  }

  response_string += "</body></html>";
  let headers = { 'content-type': 'text/html;charset=UTF-8' };
  if (username) {
    // renew login cookie
    headers['Set-Cookie'] = `username=${username}; Max-Age=315360000; Path=/`;
  }
  return new Response(response_string,
                      { headers, status: response_status });
}

async function choose_new_word_of_the_day(env) {
  const db = env.DB;
  let stmt1 = db.prepare(
    `SELECT defs.word FROM defs LEFT JOIN bad_words ON defs.word = bad_words.word
     WHERE bad_words.word IS NULL ORDER BY random() LIMIT 1;`);
  const word = (await stmt1.first()).word;
  console.log("word", word);
  let stmt2 = db.prepare(
    "UPDATE status SET word_of_the_day = ?1, wotd_timestamp = ?2;").bind(word, Date.now());
  await stmt2.run();
  return word;
}

// Reads the authoritative status from d1 and writes it to kv.
async function refresh_status(env) {
  const db = env.DB;
  let stmt1 = db.prepare(
    `SELECT word_of_the_day, def, wotd_timestamp, num_defined, total_num_words
      FROM status JOIN defs ON defs.word = status.word_of_the_day
      JOIN defs_log ON defs.def_id =defs_log.rowid;`
  );
  let stmt2 = db.prepare(
    "SELECT DISTINCT(word) FROM defs_log ORDER BY timestamp DESC LIMIT 10;");
  const rows = await db.batch([stmt1, stmt2]);

  const status_row = rows[0].results[0];
  const recently_defined = rows[1].results.map((x) => x.word);

  let status = {
    timestamp: status_row.wotd_timestamp,
    word_of_the_day: status_row.word_of_the_day,
    word_of_the_day_def: status_row.def,
    num_defined: status_row.num_defined,
    total_num_words: status_row.total_num_words,
    recently_defined: recently_defined
  };

  await env.META.put(STATUS_KEY, JSON.stringify(status));
  return status;
}

async function tryFetch(req, env, remainingRetries) {
  try {
    if (req.method == "GET" || req.method == "POST") {
      return await handle_get(req, env);
    } else if (req.method == "HEAD") {
      let full_response = await handle_get(req, env);
      return new Response("", { headers: full_response.headers,
                                status: full_response.status });
    } else {
      return new Response("bad request",
                          { status: 400 });
    }
  } catch (e) {
    console.error("caught error: ", e);
    if (req.method == "GET" && remainingRetries > 0) {
      console.error("retrying...");
      return await tryFetch(req, env, remainingRetries - 1)
    } else {
      console.error("giving up");
      let response_string = header(` Acronymy (error) `);
      response_string += render_error("Server Error", "something went wrong");
      response_string += "</body></html>";
      return new Response(response_string, {headers : { 'content-type': 'text/html;charset=UTF-8'},
                                            status: 500 });
    }
  }
}

export default {
  async fetch(req, env) {
    //if (req.headers.get('cf-connecting-ip') == "[BANNED_IP]") {
    //  return new Response("You are being temporarily banned.",
    //                      { status: 400 });
    //}
    return await tryFetch(req, env, 3);
  },

  async scheduled(event, env, ctx) {
    // event.cron is a string, the name of the cron trigger.
    await send_daily_updates(env);
  }
}
