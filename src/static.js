export const ROBOTS_TXT =
`User-agent: *
Disallow: /history
Disallow: /define`;

export const FAVICON =
`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 135.47 135.47">
 <rect width="100%" height="100%" fill="white"/>
 <g>
  <path transform="scale(.26458)" d="m179.65 92.162-140.08 350.83h52.348l33.422-89.998h165.39l33.424 89.998h51.609l-139.84-350.83h-56.277zm28.016 46.76 67.582 174.59h-134.92l67.338-174.59zm217.25 244.38v59.686h51.854v-59.686h-51.854z"/>
 </g>
</svg>`;

export const MAIN_CSS =
`body { font-family: Georgia, Serif;
        font-size: 24px;
        margin-left: auto;
        margin-right: auto;
        text-align: center;
}
* {
  box-sizing: border-box;
}
.word { font-family: Helvetica, Sans, Arial; }
.definition {
   font-size: 28px;
}
.about-definition {
   font-size: 30px;
   text-align: center;
}
@media (max-width: 530px) {
  .definition { font-size: 7vw; }
}
div {
  padding-bottom: 10pt;
}
.status {
  padding-bottom: 0;
}
.follow {
  font-size: 15px;
}
.word {
  text-align: center;
  font-size: 500%;
  font-weight: bold;
}
.extra-long {
  font-size: min(300%);
}

@media (max-width: 530px) {
  .word { font-size: 11vw; }
  .extra-long { font-size: 7vw; }
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
.suggest-word-form {
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
input[name="new-word"] {
   width: 100%;
   font-size: 27px;
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
.about-link {
  font-size: 15px;
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

.footer form button {
  width: 65px;
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

.about {
  text-align: left;
  margin: auto;
  font-size: 16px;
}

.status-title {
  margin-left: 20px;
  margin-top: 15px;
  margin-bottom: 5px;
}

.feeling-lucky {
  margin: auto;
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
}

.lucky-link {
  font-size: 16px;
  background-color: #f1f2f3;
  cursor: pointer;
  border-radius: 3px;
  border: 1px solid #a1a2a3;
  text-decoration: none;
  color: black;
  padding-left: 2px;
  padding-right: 2px;
  padding-top: 1px;
  padding-bottom: 1px;
  width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 530px) {
  .lucky-link { width: 47vw; }
}

.lucky-link:hover {
  background-color: #e1e2e3;
}

button {
  background-color: #f1f2f3;
  color: black;
  cursor: pointer;
  border-radius: 3px;
  border: 1px solid #a1a2a3;
}

button:hover {
  background-color: #e1e2e3;
}
.suggestion-pending {
  background-color: #ffffbb;
}
.suggestion-accepted {
  background-color: #ccffcc;
}
.suggestion-rejected {
  background-color: #cccccc;
}
`;
