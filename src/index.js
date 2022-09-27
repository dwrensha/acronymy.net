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

const WORD_OF_THE_DAY_KEY = "word-of-the-day";

async function handle_get(req, env) {
  let url = new URL(req.url);
  console.log("path = ", url.pathname);
  if (url.pathname == "/main.css") {
    return new Response(MAIN_CSS);
  }

  let response_string = "<html>" + HEADER + "<body>";
  response_string += "<div class=\"title\">Acronymy</div>";
  response_string += "<div>A user-editable, acronym-only dictionary.</div>";
  let word_of_the_day = await env.META.get(WORD_OF_THE_DAY_KEY);
  response_string += "<div>Today's featured word: ";
  response_string += `<a href="/define?word=${word_of_the_day}">${word_of_the_day}</a>`;
  response_string += ".</div>"
  response_string += LOOKUP_FORM;
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
