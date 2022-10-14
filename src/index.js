const MAIN_CSS =
`body { font-family: Helvetica, Sans, Arial;
        font-size: 24px;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
}
.definition {
   font-size: 28px;
}
div {
  padding-bottom: 10pt;
}
.word {
  text-align: center;
  font-size: 500%;
}
.err {
  font-size: 90%;
  color: #AA0000;
}
.title {
  text-align: center;
  font-size:500%;
}
.attribution {
   font-size: 11px;
   font-style: italic;
}
.definition-form {
   text-align: right;
   margin: auto;
   width: 500px;
}
input[name="definition"] {
   width: 100%;
   font-size: 22px;
}
.footer {
  width: 500px;
  margin: auto;
  font-size: 13px;
}
a[class="home-link"] {
  font-size: 15px;
}
.source-link {
  font-size: 12px;
}
.logged-in {
  font-style: italic;
  font-size: 11px;
}

.footer-row {
 display:flex;
 justify-content: space-between;
}
.footer form input[name="word"] {
  width: 110px;
}

.footer form input[name="username"] {
  width: 110px;
}

.history {
   width: 500px;
   text-align: left;
   margin: auto;
   font-size: 14px;
   font-style: italic;
}

.status {
  border-style: dotted;
  width: 500px;
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

const HEADER =
`<head><title> acronymy </title><link rel="stylesheet" type="text/css" href="main.css" >
 </head>`;

function define_form(word) {
  return `<div class="definition-form" >
          <form action=\"define\" method=\"get\">
          <input name=\"word\" value=\"${word}\" type=\"hidden\"/>
          <input name=\"definition\" maxlength=\"2000\" placeholder="enter new definition" class="definition-input-text" autofocus required/>
          <br>
          <button>submit</button></form>
          </div>`;
}

function render_home_footer(maybe_username) {
  let result = `<div class="footer">
                    <hr>
                <div class="footer-row">`;
  result += `<form action="define" method="get">
             <input name="word" maxlength="100" size="15"
                    placeholder="enter word" autofocus required/>
             <button>look up</button></form>`;
  result += `<a class="source-link"
                href="https://github.com/dwrensha/acronymy-workers">source code</a>`

  if (maybe_username) {
    result += `<form class="logged-in" action="logout">logged in as ${maybe_username}
               <button>log out</button></form>`
  } else {
    result +=
      `<form action="login"><input name="username" placeholder="username" size="10" required/>
       <button>log in</button>`;
  }
  result += `</form></div></div>`;
  return result;
}

function render_def_footer(word, maybe_username) {
  let result = `<div class="footer">
                <hr>
                <div class="footer-row">`;

  result += `<form action="define" method="get">
             <input name="word" maxlength="100" size="15"
                    placeholder="enter word" required/>
             <button>look up</button></form>`;

  result += `<a class="home-link" href=\"/\">Acronymy</a>`

  if (maybe_username) {
    result += `<form action="logout">logged in as ${maybe_username}
               <input name=\"word\" value=\"${word}\" type=\"hidden\"/>
               <button>log out</button></form>`
  } else {
    result +=
      `<form action="login"><input name="username" placeholder="username" size="10" required/>
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
      let words = raw_word_list.split(/[\s+]/);
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


function render_definition(word, definition, metadata) {
  let response_string = "";
  if (definition) {
    let def_words = definition.split(" ");
    response_string += `<div class="definition">`
    for (let def_word of def_words) {
      response_string += ` <a href="/define?word=${def_word}">${def_word}</a> `;
    }
    response_string += "</div>";
    if (metadata && metadata.time) {
      let time = new Date(metadata.time);
      response_string += `<div class="attribution">`;
      response_string += `—defined ${time.toUTCString()}`;
      if (metadata.user) {
        response_string += ` by ${metadata.user}`;
      }
      response_string += ` <a href="/history?word=${word}">[history]</a>`
      response_string += `</div>`;
    }
  } else {
    response_string += "<div>this word has no definition yet</div>";
  }
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

  if (url.pathname == "/main.css") {
    return new Response(MAIN_CSS);
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

  let response_string = "<html>" + HEADER + "<body>";

  if (url.pathname == "/define") {
    let word = url.searchParams.get('word');
    if (!word) {
      return new Response("need to specify word", { status: 400 })
    }
    word = word.toLowerCase().trim();
    let { value, metadata } = await env.WORDS.getWithMetadata(word);
    let definition = value;
    if (!definition && !(await WORD_LIST.is_word(word, env))) {
      response_string += `<div class="err">${word} is not in the word list</div>`;
      response_string += render_def_footer(word, username);
    } else {
      response_string += `<div class=\"word\">${word}</div>`;
      let error_message = null;
      let proposed_definition = url.searchParams.get('definition');
      if (proposed_definition) {
        let def_words = proposed_definition.trim().toLowerCase().split(/[\s+]/);
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
              await Promise.all([p1, p2]);
              definition = new_def;
            } catch (e) {
              console.log(e);
              error_message =
                "<p>error (daily quota?) while attempting to write definition</p>"
              error_message +=
                `<p>(you should maybe try asking <a href="https://twitter.com/dwrensha">@dwrensha</a> to upgrade to a paid Cloudflare plan)<p>`;
            }
          }
        } else {
          definition = await env.WORDS.get(word);
          error_message = validation_result.reason;
        }
      } else {
        definition = await env.WORDS.get(word);
      }
      response_string += render_definition(word, definition, metadata);
      response_string += define_form(word);
      if (error_message) {
        response_string += `<div class="err"> ${error_message} </div>`;
      }
      response_string += render_def_footer(word, username);
    }
  } else if (url.pathname == "/login") {
    let word = url.searchParams.get('word');
    let location = "/";
    if (word) {
      location = `/define?word=${word}`;
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
      location = `/define?word=${word}`;
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
                        <a href="/define?word=${word}">${word}</a>:</div>`;
    response_string += `<ul class="history">`
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
      if (metadata && metadata.time) {
        let time = new Date(metadata.time);
        response_string += ` — defined ${time.toUTCString()}`;
        if (metadata.user) {
          response_string += ` by ${metadata.user}`;
        }
      }
      response_string += `</li>`
    }
    response_string += `</ul>`
    response_string += render_def_footer(word, username);
  } else {
    response_string += "<div class=\"title\">Acronymy</div>";
    response_string += "<div>A user-editable, acronym-only dictionary.</div>";
    response_string += `<div class="status">`
    let status = JSON.parse(await env.META.get(STATUS_KEY));
    let word_of_the_day = status.word_of_the_day;
    let timestamp = new Date(status.timestamp);
    response_string += `<h5 class="status-title">status as of ${timestamp.toUTCString()}:</h5>`
    response_string += `<ul>`;
    response_string +=
      `<li>${status.num_defined} out of ${status.total_num_words} words have been defined.</li>`;
    response_string += "<li>Recently defined words include: ";
    for (let ii = 0; ii < status.recently_defined.length; ++ii) {
      let w = status.recently_defined[ii];
      response_string += `<a href="/define?word=${w}">${w}</a>`;
      if (ii+1 < status.recently_defined.length) {
        response_string += ", ";
      }
    }
    response_string += ".</li>";
    response_string += "<li>Today's featured word is ";
    response_string += `<b><a href="/define?word=${word_of_the_day}">${word_of_the_day}</a></b>.`;
    response_string += "</li>";
    response_string += `</div>`;
    response_string += render_home_footer(username);
  }

  response_string += "</body></html>";
  return new Response(response_string,
                      {headers: {'content-type': 'text/html;charset=UTF-8'}});
}

export default {
  async fetch(req, env) {
    if (req.method == "GET") {
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
    while (true) {
      let chunk = await env.WORDS.list();
      console.log('keys length: ' + chunk['keys'].length);
      for (let key of chunk['keys']) {
        keys.push(key);
        words.push(key['name']);
      }
      if (chunk['list_complete']) {
        break;
      }
    }

    keys.sort((k1,k2) => {
      let t1 = (k1.metadata || {}).time || 0;
      let t2 = (k2.metadata || {}).time || 0;
      console.log(t1, t2);
      return t2 - t1;
    });

    let recently_defined = [];
    for (let idx = 0; idx < keys.length && idx < 10; ++idx) {
      recently_defined.push(keys[idx].name);
    }

    let word_list_raw = await env.META.get(WORD_LIST_KEY);
    let word_list = word_list_raw.split(/[\s+]/);

    let idx = Math.floor(Math.random() * words.length);
    let word_of_the_day = words[idx];

    let status = {
      timestamp: Date.now(),
      word_of_the_day: word_of_the_day,
      num_defined: words.length,
      total_num_words: word_list.length,
      recently_defined: recently_defined
    };

    await env.META.put(STATUS_KEY, JSON.stringify(status));
  }
}
