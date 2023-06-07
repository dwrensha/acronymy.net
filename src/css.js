export const MAIN_CSS =
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
.follow {
  font-size: 15px;
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
}`;
