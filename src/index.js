import { MAIN_CSS } from "./css.js";

const ROBOTS_TXT =
`User-agent: *
Disallow: /history`;

const FAVICON =`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 135.47 135.47">
 <rect width="100%" height="100%" fill="white"/>
 <g>
  <path transform="scale(.26458)" d="m179.65 92.162-140.08 350.83h52.348l33.422-89.998h165.39l33.424 89.998h51.609l-139.84-350.83h-56.277zm28.016 46.76 67.582 174.59h-134.92l67.338-174.59zm217.25 244.38v59.686h51.854v-59.686h-51.854z"/>
 </g>
</svg>`;

const ABOUT = `<div class="about full-width">
<p>
I like to think of Acronymy as a massively multiplayer
collaborative online word game.
</p>
<p>
This <a href="http://youtu.be/LjOHnXRIp4Y">3-minute video from SIGBOVIK 2023</a>
provides a good introduction.
The video also describes a tool called Acronymy Assistant
that can compose definitions automatically.
</p>

<p>I created the initial basic version of Acronymy in 2014 as one of the first <a href="https://sandstorm.io/">Sandstorm</a> apps.</p>

<p>In September 2022, I rewrote it
using <a href="https://developers.cloudflare.com/workers/">Cloudflare Workers</a>
and moved it to its current URL,
<a href="https://acronymy.net">https://acronymy.net</a>.
Over the subsequent months, I added mobile-friendly CSS, user logins, edit history,
and lots of incremental improvements.
</p>

<p>
The source code of Acronymy is hosted
<a href="https://github.com/dwrensha/acronymy.net">on Github</a>.
Please report any bugs or feature requests there.
</p>

<p>— David Renshaw</p>
<ul>
<li><a href="https://twitter.com/dwrensha">@dwrensha</a> on Twitter</li>
<li><a href="https://social.wub.site/@david">@david@social.wub.site</a> on Mastodon</li>
</ul>
</div>`;

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

function render_footer(options, home_or_about, login_redirect) {
  let entered_word = "";
  if (options.entered_word) {
    entered_word = `value="${options.entered_word}"`;
  }
  let autofocus_define = options.autofocus_define ? "autofocus" : "";

  let result = `\n<div class="footer full-width"><hr><div class="footer-row">`;
  result += `<form action="/define" method="get">`;
  result += `<input name="word" maxlength="100" size="15"`;
  result +=        `placeholder="enter word" ${entered_word} ${autofocus_define} required/>`;
  result += `<button>look up</button></form>`;
  result += home_or_about;

  if (options.username) {
    result += `<form class="logged-in" action="/logout">logged in as ${options.username}`;
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

function render_home_footer(maybe_username) {
  return render_footer({"username" : maybe_username, "autofocus_define": true},
                       `<a class="about-link" href="/about">about</a>`,
                       "/");
}

function render_about_footer(maybe_username) {
  return render_footer({"username" : maybe_username},
                       `<a class="home-link" href=\"/\">Acronymy</a>`,
                       "/about");
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
  const result = await stmt.run();
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
        reason: `${def_word} is not in the word list`
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

async function send_toot(mastodon_url, token, status_text, visibility) {
  const data = new URLSearchParams();
  data.append('status', status_text);
  data.append('visibility', visibility);

  return fetch(mastodon_url + "/api/v1/statuses",
        { method : 'POST',
          headers : {authorization: `Bearer ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"},
          body : data,
          signal: AbortSignal.timeout(5000), // timeout after 5 seconds
        });
}

async function toot_submission(env, word, new_def, user) {
  if (!env.MASTODON_URL) {
    console.error("Environment variable MASTODON_URL is empty. Not tooting.");
    return;
  }

  let attribution = "—submitted anonymously";
  if (user) {
    attribution = "—submitted by " + user;
  }

  return send_toot(env.MASTODON_URL,
                   env.MASTODON_TOKEN,
                   `${new_def}\n\nhttps://acronymy.net/define/${word}\n${attribution}\n`,
                   "unlisted");
}

async function toot_daily_update(env, toot_text) {
  if (!env.MASTODON_URL) {
    console.error("Environment variable MASTODON_URL is empty. Not tooting.");
    return;
  }

  return send_toot(env.MASTODON_URL, env.DAILY_UPDATE_MASTODON_TOKEN, toot_text, "public");
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
      response_string += ` <a href="/history?word=${word}">[history]</a>`
    } else {
      response_string += `—defined before the beginning of history (October 2022)`;
    }
    response_string += `</div>`;
  } else {
    response_string += "<div><i>this word has no definition yet</i></div>";
  }
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

async function update_def(req, env, word, definition, username) {
  const db = env.DB;
  let stmt1 = db.prepare(
    "INSERT INTO defs_log (word, def, author, timestamp, ip) VALUES (?1, ?2, ?3, ?4, ?5)");
  let timestamp = Date.now();
  let metadata= { time: timestamp };

  let ip = null;
  if (req.headers.has('cf-connecting-ip')) {
    ip = req.headers.get('cf-connecting-ip');
    metadata['ip'] = ip;
  }
  let author = null;
  if (username && validate_username(username).valid) {
    author = username;
    metadata['user'] = author;
  }

  stmt1 = stmt1.bind(word, definition, author, timestamp, ip);
  let stmt2 = db.prepare(
    "INSERT INTO defs (word, def_id) VALUES (?1, last_insert_rowid()) " +
      "ON CONFLICT (word) DO UPDATE SET def_id = excluded.def_id;");
  stmt2 = stmt2.bind(word);

  await db.batch([stmt1, stmt2]);

  let p3 = toot_submission(env, word, definition, username).catch((e) => {
    console.log("error on toot attempt: ", e);
  });

  await Promise.all(
    [refresh_status(env),
     env.WORDS.put(word, definition, {metadata}),
     env.WORDS_LOG.put(word + ":" + timestamp, definition, {metadata}),
     p3]);
}

async function get_random_defined_word(env) {
  const db = env.DB;
  let stmt1 = db.prepare("SELECT max(rowid) as rowid FROM defs");
  const result = await stmt1.run();
  const max_rowid = result.results[0].rowid;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let rowid = Math.floor(Math.random() * max_rowid) + 1;
    let stmt2 = db.prepare("SELECT word FROM defs WHERE rowid = ?1").bind(rowid);
    const result = await stmt2.run();
    if (result.results.length > 0) {
      return result.results[0].word;
    }
  }
  return null;
}

async function get_random_undefined_word(env) {
  const db = env.DB;
  let stmt1 = db.prepare("SELECT max(rowid) as rowid FROM words");
  const result = await stmt1.run();
  const max_rowid = result.results[0].rowid;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let rowid = Math.floor(Math.random() * max_rowid) + 1;
    let stmt2 = db.prepare("SELECT word FROM words WHERE rowid = ?1").bind(rowid);
    const result2 = await stmt2.run();
    let word = result2.results[0].word;

    let stmt3 = db.prepare("SELECT word FROM defs WHERE word = ?1").bind(word);
    const result3 = await stmt3.run();
    if (result3.results.length == 0) {
      // This word is not defined yet.
      return word;
    }
  }
  return null;
}

async function handle_get(req, env) {
  let url = new URL(req.url);

  if (url.pathname == "/robots.txt") {
    return new Response(ROBOTS_TXT);
  }

  if (url.pathname == "/main.css") {
    return new Response(MAIN_CSS,
                        {headers: {"Content-type": "text/css",
                                   "Cache-Control": "max-age=600"}});
  }

  if (url.pathname == "/favicon.svg") {
    return new Response(FAVICON, {headers: {"Content-type": "image/svg+xml"}});
  }

  if (url.pathname == "/apple-touch-icon.png") {
    let icon = await env.META.get("apple-touch-icon.png", {type: "arrayBuffer"});
    return new Response(icon, { headers: {"Content-type": "image/png" }});
  }

  let username = null;
  if (req.headers.has('Cookie')) {
    for (let cookie of req.headers.get('Cookie').split(";")) {
      let components = cookie.split('=');
      let name = components[0].trim();
      if (name == 'username') {
        username = components[1];
      }
    }
  }

  let response_string = header(" Acronymy ");
  let response_status = 200;
  if (url.pathname == "/define") {
    // Result of submitting the "look up" form.
    // Redirect to "/define/<word>".
    let word = url.searchParams.get('word');
    if (!word) {
      return new Response("need to specify word", { status: 400 })
    }
    let encoded_word = encodeURI(word.toLowerCase().trim());
    return new Response("",
                        {status: 302,
                         headers: {'Location': `/define/${encoded_word}`, }});
  } else if (url.pathname.startsWith("/define/")) {
    let word = url.pathname.slice("/define/".length);
    response_string = header(` Acronymy - ${word} `);
    let { value, metadata } = await env.WORDS.getWithMetadata(word);
    let definition = value;
    let input_starting_value = null;
    if (!definition && !(await is_word(word, env))) {
      let decoded_word = decodeURI(word);
      response_string += render_error("Not Found", `${decoded_word} is not in the word list`);
      response_string += render_def_footer(word, username, decoded_word);
      response_status = 404;
    } else {
      response_string += `<div class=\"word\">${word}</div>`;
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
              await update_def(req, env, word, new_def, username);
              return new Response("",
                                  {status: 303,
                                   headers: {'Location': `/define/${word}` }});
            } catch (e) {
              console.log(e);
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
                           headers: {'Location': location,
                                     'Set-Cookie': `username=${username}`}});
    }
  } else if (url.pathname == "/logout") {
    let location = url.searchParams.get('redirect') || "/";
    return new Response("",
                        {status: 302,
                         headers: {'Location': location,
                                   'Set-Cookie':
                                      `username=X; expires=Thu, 01 Jan 1970 00:00:00 GMT`}});
  } else if (url.pathname == "/history") {
    let word = url.searchParams.get('word');
    if (!word) {
      return new Response("need to specify word", { status: 400 })
    }

    const db = env.DB;
    let stmt1 = db.prepare(
      "SELECT def, author, timestamp FROM defs_log WHERE word = ?1 ORDER BY timestamp DESC");
    stmt1 = stmt1.bind(word);
    let db_result = await stmt1.run();
    let entries = db_result.results;

    response_string += `<div>history of definitions for
                        <a href="/define/${word}">${word}</a>:</div>`;
    response_string += `<div class="history full-width"><ul>`
    for (let ii = 0; ii < entries.length; ++ii) {
      let entry = entries[ii];
      response_string += `<li>${entry.def}`
      if (!entry.timestamp) {
        response_string += ` — defined before the beginning of history (October 2022)`;
      } else {
        let time = new Date(entry.timestamp);
        response_string += ` — defined ${time.toUTCString()}`;
        if (entry.author) {
          response_string += ` by ${entry.author}`;
        }
      }
      response_string += `</li>`
    }
    response_string += `</ul></div>`
    response_string += render_footer(
      {"username" : username},
      `<a class="home-link" href=\"/\">Acronymy</a>`,
      "/history?word=" + word);
  } else if (url.pathname == "/about") {
    response_string += ABOUT;
    response_string += render_about_footer(username);
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
    response_string += "<div class=\"title\">Acronymy</div>";
    response_string += "<div>Can we define every word as an acronym?</div>";
    response_string += `<div class="follow">Follow at <a href="https://social.wub.site/@acronymy">@acronymy</a> or `
    response_string +=
      `<a href="https://social.wub.site/@daily_acronymy">@daily_acronymy</a>.</div>`;
    response_string += `<div class="status full-width">`
    let status = JSON.parse(await env.META.get(STATUS_KEY));
    let word_of_the_day = status.word_of_the_day;
    let timestamp = new Date(status.timestamp);
    response_string += `<ul>`;
    let percent = (100 * status.num_defined/status.total_num_words).toFixed(4);
    response_string +=
      `<li>${status.num_defined} out of ${status.total_num_words}
           words have been defined (${percent}%).</li>`;
    response_string += "<li>Recently defined words include: ";
    for (let ii = 0; ii < status.recently_defined.length; ++ii) {
      let w = status.recently_defined[ii];
      response_string += `<a href="/define/${w}">${w}</a>`;
      if (ii+1 < status.recently_defined.length) {
        response_string += ", ";
      }
    }
    response_string += ".</li>";
    response_string += "<li>Today's featured word is ";
    response_string += `<b><a href="/define/${word_of_the_day}">${word_of_the_day}</a></b>.`;
    response_string += `</div>`;

    response_string += '<div class="feeling-lucky full-width">'
    response_string += `<a class="lucky-link" href="/random">random defined word</a>
                        <a class="lucky-link" href="/random-todo">random undefined word</a>`;
    response_string += "</div>"

    response_string += render_home_footer(username);
  } else {
    response_status = 404;
    response_string += render_error("Not Found",
                                    `"${url.pathname}" was not found`);
    response_string += render_not_found_footer(username);
  }

  response_string += "</body></html>";
  return new Response(response_string,
                      {headers: {'content-type': 'text/html;charset=UTF-8'},
                       status: response_status });
}

async function choose_new_word_of_the_day(env) {
  const db = env.DB;
  let stmt1 = db.prepare(
    `SELECT defs.word FROM defs LEFT JOIN bad_words ON defs.word = bad_words.word
     WHERE bad_words.word IS NULL ORDER BY random() LIMIT 1;`);
  const rows = await stmt1.run();
  let word = rows.results[0].word;
  let stmt2 = db.prepare(
    "UPDATE status SET word_of_the_day = ?1, wotd_timestamp = ?2;").bind(word, Date.now());
  await stmt2.run();
  return word;
}

// Reads the authoritative status from d1 and writes it to kv.
async function refresh_status(env) {
  const db = env.DB;
  let stmt1 = db.prepare(
    "SELECT word_of_the_day, wotd_timestamp, num_defined, total_num_words FROM status;");
  let stmt2 = db.prepare(
    "SELECT DISTINCT(word) FROM defs_log ORDER BY timestamp DESC LIMIT 10;");
  const rows = await db.batch([stmt1, stmt2]);

  const status_row = rows[0].results[0];
  const recently_defined = rows[1].results.map((x) => x.word);

  let status = {
    timestamp: status_row.wotd_timestamp,
    word_of_the_day: status_row.word_of_the_day,
    num_defined: status_row.num_defined,
    total_num_words: status_row.total_num_words,
    recently_defined: recently_defined
  };

  await env.META.put(STATUS_KEY, JSON.stringify(status));
  return status;
}

export default {
  async fetch(req, env) {
    //if (req.headers.get('cf-connecting-ip') == "[BANNED_IP]") {
    //  return new Response("You are being temporarily banned.",
    //                      { status: 400 });
    //}
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
  },

  async scheduled(event, env, ctx) {
    // event.cron is a string, the name of the cron trigger.

    const word_of_the_day = await choose_new_word_of_the_day(env);
    const status = await refresh_status(env);

    // send @daily_acronymy toot
    let word_of_the_day_def = await env.WORDS.get(word_of_the_day);
    let percent = (100 * status.num_defined/status.total_num_words).toFixed(3);
    let capitalized_def = word_of_the_day_def.split(' ').map(
      str => str.charAt(0).toUpperCase() + str.slice(1)).join(' ');
    let toot_text =
        `The acronym of the day is ${word_of_the_day.toUpperCase()}:\n\n` +
        capitalized_def + "\n\n"+
        "--------------------------------------------\n\n" +
        `To submit a new definition for this word, visit https://acronymy.net/define/${word_of_the_day}.\n\n` +
        `So far, ${status.num_defined} out of ${status.total_num_words} `+
        `words have been defined (${percent}%).`;
    await toot_daily_update(env,toot_text);
  }
}
