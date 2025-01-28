import {initialize} from "./trainer/ClueTrainer";

document.addEventListener("DOMContentLoaded", (e) => {
  //check if we are running inside alt1 by checking if the alt1 global exists
  if (window.alt1) {
    //tell alt1 about the app
    //this makes alt1 show the add app button when running inside the embedded browser
    //also updates app settings if they are changed
    alt1.identifyAppUrl("appconfig.json");
  }

  initialize()
})


