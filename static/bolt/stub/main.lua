local bolt = require("bolt")
bolt.checkversion(1, 0)

local cluetrainer = bolt.createbrowser(300, 200, "http://127.0.0.1:8000/", "window.in_bolt=true;")

cluetrainer:showdevtools()
