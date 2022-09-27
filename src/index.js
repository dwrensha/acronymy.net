const MAIN_CSS =
`body { font-family: Helvetica, Sans, Arial;
        font-size: medium;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
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
}`;

const HEADER =
`<head><title> acronymy </title><link rel="stylesheet" type="text/css" href="main.css" >
 </head>`;

const LOOKUP_FORM =
`<form action="define" method="get">
 <input name="word" maxlength="100"/><button>find word</button></form>`;

function define_form(word) {
  return `<form action=\"define\" method=\"get\">
          <input name=\"word\" value=\"${word}\" type=\"hidden\"/>
          <input name=\"definition\" maxlength=\"2000\"/>
          <button>submit definition</button></form>`;
}

const HOME_LINK = "<a href=\"/\">home</a>";

const WORD_OF_THE_DAY_KEY = "word-of-the-day";
const WORD_LIST_KEY = "word-list";

const WORD_LIST = new Set();

async function get_word_list(env) {
  if (WORD_LIST.size == 0) {
    let raw_word_list = await env.META.get(WORD_LIST_KEY);
    let words = raw_word_list.split(/(\s+)/);
    for (let word of words) {
      WORD_LIST.add(word);
    }
  }
  return WORD_LIST;
}



async function handle_get(req, env) {
  let url = new URL(req.url);
  console.log("path = ", url.pathname);
  if (url.pathname == "/main.css") {
    return new Response(MAIN_CSS);
  }

  let response_string = "<html>" + HEADER + "<body>";

  if (url.pathname == "/define") {
    console.log("query = ", url.searchParams);
    let word = url.searchParams.get('word');
    if (!word) {
      return new Response("need to specify word", { status: 400 })
    }
    let word_list = await get_word_list(env);
    if (!word_list.has(word)) {
      return new Response(word + " is not in the word list", { status: 400 })
    }

    if (url.searchParams.get('definition')) {

    } else {
      response_string += `<div class=\"word\">${word}</div>`;
      console.log(`looking up |${word}|`);
      let definition = await env.WORDS.get(word);
      if (definition) {
        let def_words = definition.split(" ");
        response_string += "<div>"
        for (let def_word of def_words) {
          response_string += ` <a href="/define?word=${def_word}">${def_word}</a> `;
        }
        response_string += "</div>";
      } else {
        response_string += "<div>this word has no definition yet</div>";
      }
      response_string += define_form(word);
      response_string += HOME_LINK;
    }
  } else {
    response_string += "<div class=\"title\">Acronymy</div>";
    response_string += "<div>A user-editable, acronym-only dictionary.</div>";
    let word_of_the_day = await env.META.get(WORD_OF_THE_DAY_KEY);
    response_string += "<div>Today's featured word: ";
    response_string += `<a href="/define?word=${word_of_the_day}">${word_of_the_day}</a>`;
    response_string += ".</div>"
    response_string += LOOKUP_FORM;
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
      return new Response(400);
    }
  },

  async scheduled(event, env, ctx) {
    // event.cron is a string, the name of the cron trigger.
  }
}
