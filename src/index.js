const MAIN_CSS =
`body { font-family: Helvetica, Sans, Arial;
        font-size: 24px;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
}
* {
  box-sizing: border-box;
}
.definition {
   font-size: 28px;
}
@media (max-width: 530px) {
  .definition { font-size: 7vw; }
}
div {
  padding-bottom: 10pt;
}
.word {
  text-align: center;
  font-size: 500%;
  font-weight: bold;
}
@media (max-width: 530px) {
  .word { font-size: 11vw; }
}
.big-error {
  text-align: center;
  font-size: 300%;
  font-weight: bold;
  color: #AA0000;
}
@media (max-width: 530px) {
  .big-error { font-size: 11vw; }
}
.err {
  font-size: 90%;
  color: #AA0000;
}
.title {
  text-align: center;
  font-size: 500%;
}
.attribution {
   font-size: 11px;
   font-style: italic;
}
.definition-form {
   text-align: right;
   margin: auto;
}
.full-width {
   width: 500px;
}
@media (max-width: 530px) {
  .title { font-size: 16vw; }
}
@media (max-width: 500px) {
  .full-width {
     width: 97vw;
  }
}
input[name="definition"] {
   width: 100%;
   font-size: 22px;
}
.footer {
  margin: auto;
  font-size: 13px;
}
a[class="home-link"] {
  font-size: 15px;
}
.source-link {
  font-size: 12px;
  margin-bottom: 13px;
}
.logged-in {
  font-style: italic;
  font-size: 11px;
}

.footer-row {
 display:flex;
 justify-content: space-between;
}


.footer form input {
  width: 110px;
}

@media (max-width: 475px) {
  a[class="home-link"] {
    font-size: 3vw;
   }
 .footer form {
  text-align: right;
  width: 30vw;
 }
 .footer form input {
   width: 100%;
 }
}

.history {
   text-align: left;
   margin: auto;
   font-size: 14px;
   font-style: italic;
}

.not-defined {
  border-style: dotted;
  border-width: 1px;
}

.status {
  border-style: dotted;
  text-align: left;
  margin: auto;
  font-size: 17px;
}

.status-title {
  margin-left: 20px;
  margin-top: 15px;
  margin-bottom: 5px;
}
`;

const ROBOTS_TXT =
`User agent: serpstatbot
Disallow: /

User-agent: *
Disallow: /history`

const FAVICON =`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 135.47 135.47">
 <rect width="100%" height="100%" fill="white"/>
 <g>
  <path transform="scale(.26458)" d="m179.65 92.162-140.08 350.83h52.348l33.422-89.998h165.39l33.424 89.998h51.609l-139.84-350.83h-56.277zm28.016 46.76 67.582 174.59h-134.92l67.338-174.59zm217.25 244.38v59.686h51.854v-59.686h-51.854z"/>
 </g>
</svg>`;

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

function render_home_footer(maybe_username) {
  let result = `<div class="footer full-width">
                    <hr>
                <div class="footer-row">`;
  result += `<form action="/define" method="get">
             <input name="word" maxlength="100" size="15"
                    placeholder="enter word" autofocus required/>
             <button>look up</button></form>`;
  result += `<a class="source-link"
                href="https://github.com/dwrensha/acronymy-workers">source code</a>`

  if (maybe_username) {
    result += `<form class="logged-in" action="/logout">logged in as ${maybe_username}
               <button>log out</button></form>`
  } else {
    result +=
      `<form action="/login"><input name="username" placeholder="username" size="10" required/>
       <button>log in</button>`;
  }
  result += `</form></div></div>`;
  return result;
}

function render_def_footer(word, maybe_username, maybe_entered_word) {
  let result = `<div class="footer full-width">
                <hr>
                <div class="footer-row">`;

  let entered_word = "";
  if (maybe_entered_word) {
    entered_word = `value="${maybe_entered_word}"`;
  }

  result += `<form action="/define" method="get">
             <input name="word" maxlength="100" size="15"
                    placeholder="enter word" ${entered_word} required/>
             <button>look up</button></form>`;

  result += `<a class="home-link" href=\"/\">Acronymy</a>`

  if (maybe_username) {
    result += `<form action="/logout">logged in as ${maybe_username}
               <input name=\"word\" value=\"${word}\" type=\"hidden\"/>
               <button>log out</button></form>`
  } else {
    result +=
      `<form action="/login"><input name="username" placeholder="username" size="10" required/>
       <input name=\"word\" value=\"${word}\" type=\"hidden\"/>
       <button>log in</button>`;
  }
  result += `</form></div></div>`;
  return result;
}

const WORD_LIST_KEY = "word-list";
const STATUS_KEY = "status";

class WordList {
  constructor() {
    // One Set for each possible initial letter of a word.
    // The wordlist is sharded like this to decrease the cold-start
    // cost of looking up a single word.
    this.subsets = new Map();
  }

  async is_word(query, env) {
    if (query.length == 0) return false;
    let first_letter = query[0];
    if (!this.subsets.has(first_letter)) {
      let raw_word_list = await env.META.get(WORD_LIST_KEY + "-" + first_letter);
      if (!raw_word_list) {
        return false;
      }
      let subset = new Set();
      this.subsets.set(first_letter, subset);
      let words = raw_word_list.split(/\s+/);
      for (let word of words) {
        subset.add(word);
      }
    }
    return this.subsets.get(first_letter).has(query);
  }
}
const WORD_LIST = new WordList();

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
    def_promises.push(WORD_LIST.is_word(def_word, env));
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

async function toot_submission(env, word, new_def, metadata) {
  if (!env.MASTODON_URL) {
    console.error("Environment variable MASTODON_URL is empty. Not tooting.");
    return;
  }
  const url = env.MASTODON_URL + "/api/v1/statuses";
  const token = env.MASTODON_TOKEN;
  const data = new URLSearchParams();
  let attribution = "—submitted anonymously";
   if (metadata.user) {
    attribution = "—submitted by " + metadata.user;
  }
  data.append('status',
              `${new_def}\n\n` +
              `https://acronymy.net/define/${word}\n` +
              attribution + "\n");

  data.append('visibility',
              'unlisted');

  return fetch(url,
        { method : 'POST',
          headers : {authorization: `Bearer ${token}`},
          body : data
        });
}

async function toot_daily_update(env, toot_text) {
  if (!env.MASTODON_URL) {
    console.error("Environment variable MASTODON_URL is empty. Not tooting.");
    return;
  }
  const url = env.MASTODON_URL + "/api/v1/statuses";
  const token = env.DAILY_UPDATE_MASTODON_TOKEN;
  const data = new URLSearchParams();
  data.append('status', toot_text);
  data.append('visibility',
              'public');

  return fetch(url,
        { method : 'POST',
          headers : {authorization: `Bearer ${token}`},
          body : data
        });
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

async function handle_get(req, env) {
  let url = new URL(req.url);
  if (url.origin == "https://acronymy.word.workers.dev") {
    const {pathname, search} = url;
    const destinationURL = "https://acronymy.net" + pathname + search;
    return Response.redirect(destinationURL, 301);
  }

  if (url.pathname == "/robots.txt") {
    return new Response(ROBOTS_TXT);
  }

  if (url.pathname == "/main.css") {
    return new Response(MAIN_CSS, {headers: {"Content-type": "text/css"}});
  }

  if (url.pathname == "/favicon.svg") {
    return new Response(FAVICON, {headers: {"Content-type": "image/svg+xml"}});
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
    word = word.toLowerCase().trim();
    return new Response("",
                        {status: 302,
                         headers: {'Location': `/define/${word}`, }});
  } else if (url.pathname.startsWith("/define/")) {
    let word = url.pathname.slice("/define/".length);
    response_string = header(` Acronymy - ${word} `);
    let { value, metadata } = await env.WORDS.getWithMetadata(word);
    let definition = value;
    let input_starting_value = null;
    if (!definition && !(await WORD_LIST.is_word(word, env))) {
      response_string += render_error("Not Found", `${word} is not in the word list`);
      response_string += render_def_footer(word, username, word);
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
              let now = Date.now();
              metadata= {
                time: now
              };
              if (req.headers.has('cf-connecting-ip')) {
                metadata['ip'] = req.headers.get('cf-connecting-ip');
              }
              if (username && validate_username(username).valid) {
                metadata['user'] = username;
              }
              let p1 = env.WORDS.put(word, new_def, {metadata});
              let p2 = env.WORDS_LOG.put(word + ":" + now, new_def, {metadata});
              let p3 = toot_submission(env, word, new_def, metadata).catch((e) => {
                console.log("error on toot attempt: ", e);
              });
              await Promise.all([p1, p2, p3]);
              return new Response("",
                                  {status: 303,
                                   headers: {'Location': `/define/${word}` }});
            } catch (e) {
              console.log(e);
              error_message =
                "<p>error (daily quota?) while attempting to write definition</p>"
              error_message +=
                `<p>(you should maybe try asking <a href="https://twitter.com/dwrensha">@dwrensha</a> to upgrade to a paid Cloudflare plan)<p>`;
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
    let word = url.searchParams.get('word');
    let location = "/";
    if (word) {
      location = `/define/${word}`;
    }

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
    let word = url.searchParams.get('word');
    let location = "/";
    if (word) {
      location = `/define/${word}`;
    }
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

    let entries = [];
    try {
      while (true) {
        let chunk = await env.WORDS_LOG.list({prefix: word + ":"});
        for (let key of chunk['keys']) {
          entries.push(key);
        }
        if (chunk['list_complete']) {
          break;
        }
      }
    } catch (e) {
      console.log(e);
      return new Response("Error while listing history. Maybe we've hit daily quota?",
                          { status: 500 })
    }
    entries.reverse();

    response_string += `<div>history of definitions for
                        <a href="/define/${word}">${word}</a>:</div>`;
    response_string += `<div class="history full-width"><ul>`
    let promises = [];
    for (let entry of entries) {
      promises.push(await env.WORDS_LOG.get(entry.name));
    }
    let defs = await Promise.all(promises);
    for (let ii = 0; ii < defs.length; ++ii) {
      let def = defs[ii];
      let entry = entries[ii];
      response_string += `<li>${def}`
      let metadata = entry.metadata;
      if (metadata && 0 == metadata.time) {
        response_string += ` — defined before the beginning of history (October 2022)`;
      }
      if (metadata && metadata.time) {
        let time = new Date(metadata.time);
        response_string += ` — defined ${time.toUTCString()}`;
        if (metadata.user) {
          response_string += ` by ${metadata.user}`;
        }
      }
      response_string += `</li>`
    }
    response_string += `</ul></div>`
    response_string += render_def_footer(word, username);
  } else {
    response_string += "<div class=\"title\">Acronymy</div>";
    response_string += "<div>A user-editable, acronym-only dictionary.</div>";
    response_string += `<div class="status full-width">`
    let status = JSON.parse(await env.META.get(STATUS_KEY));
    let word_of_the_day = status.word_of_the_day;
    let timestamp = new Date(status.timestamp);
    response_string += `<h5 class="status-title">status as of ${timestamp.toUTCString()}:</h5>`
    response_string += `<ul>`;
    let percent = (100 * status.num_defined/status.total_num_words).toFixed(3);
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
    response_string += "</li>";
    response_string += `</div>`;
    response_string += render_home_footer(username);
  }

  response_string += "</body></html>";
  return new Response(response_string,
                      {headers: {'content-type': 'text/html;charset=UTF-8'},
                       status: response_status });
}

export default {
  async fetch(req, env) {
    if (req.method == "GET" || req.method == "POST") {
      return await handle_get(req, env);
    } else {
      return new Response("bad request",
                          { status: 400 });
    }
  },

  async scheduled(event, env, ctx) {
    // event.cron is a string, the name of the cron trigger.

    let words = [];
    let keys = [];
    let options = {};
    while (true) {
      let chunk = await env.WORDS.list(options);
      console.log('keys length: ' + chunk['keys'].length);
      for (let key of chunk['keys']) {
        keys.push(key);
        words.push(key['name']);
      }
      if (chunk['list_complete']) {
        break;
      } else {
        options.cursor = chunk['cursor'];
      }
    }

    keys.sort((k1,k2) => {
      let t1 = (k1.metadata || {}).time || 0;
      let t2 = (k2.metadata || {}).time || 0;
      return t2 - t1;
    });

    let recently_defined = [];
    for (let idx = 0; idx < keys.length && idx < 10; ++idx) {
      recently_defined.push(keys[idx].name);
    }

    let word_list_raw = await env.META.get(WORD_LIST_KEY);
    let word_list_length = word_list_raw.match(/\n/g).length;

    let idx = Math.floor(Math.random() * words.length);
    let word_of_the_day = words[idx];

    let status = {
      timestamp: Date.now(),
      word_of_the_day: word_of_the_day,
      num_defined: words.length,
      total_num_words: word_list_length,
      recently_defined: recently_defined
    };

    await env.META.put(STATUS_KEY, JSON.stringify(status));

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
