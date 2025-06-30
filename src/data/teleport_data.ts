import {direction} from "lib/runescape/movement";
import {Transportation} from "../lib/runescape/transportation";

const default_teleport_ticks: number = 3 // Shadow rip

const raw_data: Transportation.TeleportGroup[] = [
  {
    type: "teleports",
    id: "home",
    name: "Lodestone Network",
    img: {url: "homeport.png"},
    animation_ticks: 7,
    spots: [
      {
        id: "alkharid",

        img: {url: "lode_alkharid.png", width: 28},
        code: "A",
        name: "Al Kharid",
        target: {origin: {x: 3297, y: 3184, level: 0}},
        facing: direction.south,
      },
      {
        id: "anachronia",
        name: "Anachronia",
        img: {url: "lode_anachronia.png", height: 28},
        code: "Alt+D",
        target: {origin: {x: 5431, y: 2338, level: 0}},
        facing: direction.south,
      },
      {
        id: "ardougne",
        img: {url: "lode_ardougne.png", height: 28},
        code: "Alt+A",
        target: {origin: {x: 2634, y: 3348, level: 0}},
        facing: direction.south,
        name: "Ardougne",
      },
      {
        id: "ashdale",
        name: "Ashdale",

        img: {url: "lode_ashdale.png", height: 28},
        code: "Shift+A",
        target: {origin: {x: 2474, y: 2708, level: 2}},
        facing: direction.south,
      },
      {
        id: "banditcamp",
        img: {url: "lode_bandit.png", width: 28},
        code: "Alt+B",
        target: {origin: {x: 3214, y: 2954, level: 0}},
        facing: direction.south,
        name: "Bandit Camp",
      },
      {
        id: "burthorpe",
        img: {url: "lode_burthorpe.png", height: 28},
        code: "B",
        target: {origin: {x: 2899, y: 3544, level: 0}},
        facing: direction.south,
        name: "Burthorpe",
      },
      {
        id: "canifis",
        img: {url: "lode_canifis.png", height: 28},
        code: "Alt+C",
        target: {origin: {x: 3517, y: 3515, level: 0}},
        facing: direction.south,
        name: "Canifis",
      },
      {
        id: "catherby",
        img: {url: "lode_catherby.png", height: 28},
        code: "C",
        target: {origin: {x: 2811, y: 3449, level: 0}},
        facing: direction.south,
        name: "Catherby",
      },
      {
        id: "draynor",
        img: {url: "lode_draynor.png", height: 28},
        code: "D",
        target: {origin: {x: 3105, y: 3298, level: 0}},
        facing: direction.south,
        name: "Draynor",
      }
      ,
      {
        id: "eaglespeak",
        img: {url: "lode_eagles.png", height: 28},
        code: "Alt+E",
        target: {origin: {x: 2366, y: 3479, level: 0}},
        facing: direction.south,
        name: "Eagles` Peak",
      },
      {
        id: "edgeville",
        img: {url: "lode_edgeville.png", height: 28},
        code: "E",
        target: {origin: {x: 3067, y: 3505, level: 0}},
        facing: direction.south,
        name: "Edgeville",
      },
      {
        id: "falador",
        img: {url: "lode_falador.png", height: 28},
        code: "F",
        target: {origin: {x: 2967, y: 3403, level: 0}},
        facing: direction.south,
        name: "Falador",
      },
      {
        id: "fortforinthry",
        img: {url: "lode_fortforinthry.png", height: 28},
        code: "Alt+W",
        target: {origin: {x: 3298, y: 3525, level: 0}},
        facing: direction.south,
        name: "Fort Forinthry",
      },
      {
        id: "fremmenik",
        img: {url: "lode_fremennik.png", height: 28},
        code: "Alt+F",
        target: {origin: {x: 2712, y: 3677, level: 0}},
        facing: direction.south,
        name: "Fremennik Province",
      },
      {
        id: "karamja",
        img: {url: "lode_karamja.png", height: 28},
        code: "K",
        target: {origin: {x: 2761, y: 3147, level: 0}},
        facing: direction.south,
        name: "Karamja",
      },
      {
        id: "lumbridge",
        img: {url: "lode_lumbridge.png", height: 28},
        code: "L",
        target: {origin: {x: 3233, y: 3221, level: 0}},
        facing: direction.south,
        name: "Lumbridge",
      },
      {
        id: "lunarisle",
        img: {url: "lode_lunar.png", height: 28},
        code: "Alt+L",
        target: {origin: {x: 2085, y: 3914, level: 0}},
        facing: direction.south,
        name: "Lunar Isle",
      },
      {
        id: "menaphos",
        img: {url: "lode_menaphos.png", height: 28},
        code: "M",
        target: {origin: {x: 3216, y: 2716, level: 0}},
        facing: direction.south,
        name: "Menaphos",
      },
      {
        id: "ooglog",
        img: {url: "lode_ooglog.png", height: 28},
        code: "O",
        target: {origin: {x: 2532, y: 2871, level: 0}},
        facing: direction.south,
        name: "Oo´glog",
      },
      {
        id: "portsarim",
        img: {url: "lode_portsarim.png", height: 28},
        code: "P",
        target: {origin: {x: 3011, y: 3215, level: 0}},
        facing: direction.south,
        name: "Port Sarim",
      },
      {
        id: "prifddinas",
        img: {url: "lode_prifddinas.png", height: 28},
        code: "Alt+P",
        target: {origin: {x: 2208, y: 3360, level: 1}},
        facing: direction.south,
        name: "Prifddinas",
      },
      {
        id: "seersvillage",
        img: {url: "lode_seers.png", height: 28},
        code: "S",
        target: {origin: {x: 2689, y: 3482, level: 0}},
        facing: direction.south,
        name: "Seers´ Village",
      }
      , {
        id: "taverley",

        img: {url: "lode_taverley.png", height: 28},
        code: "T",
        target: {origin: {"x": 2878, "y": 3442, "level": 0}},
        facing: direction.south,
        name: "Taverley",
      },
      {
        id: "tirannwn",
        img: {url: "lode_tirannwn.png", height: 28},
        code: "Alt+T",
        target: {origin: {x: 2254, y: 3149, level: 0}},
        facing: direction.south,
        name: "Tirannwn",
      },
      {
        id: "varrock",
        img: {url: "lode_varrock.png", height: 28},
        code: "V",
        target: {origin: {x: 3214, y: 3376, level: 0}},
        facing: direction.south,
        name: "Varrock",
      },
      {
        id: "wilderness",
        img: {url: "lode_wilderness.png", height: 28},
        code: "W",
        target: {origin: {x: 3143, y: 3635, level: 0}},
        facing: direction.south,
        name: "Wilderness",
      },
      {
        id: "yanille",
        img: {url: "lode_yanille.png", height: 28},
        code: "Y",
        target: {origin: {x: 2529, y: 3094, level: 0}},
        facing: direction.south,
        name: "Yanille",
      },
      {
        id: "cityofum",
        img: {url: "lode_um.png", height: 28},
        code: "U",
        target: {origin: {x: 1084, y: 1768, level: 1}},
        facing: direction.east,
        name: "City of Um",
      },
    ],
    access: [
      {
        id: "map", type: "spellbook",
        name: "Lodestone Network Map",
        menu_ticks: 1
      }, {
        id: "spellbook",
        type: "spellbook",
        name: "Any Spellbook",
        menu_ticks: 0
      }
    ]
  },
  {
    type: "teleports",
    id: "normalspellbook",
    name: "Normal Spellbook",
    menu_ticks: 0,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "camelot",
        target: {"origin": {"x": 2755, "y": 3476, "level": 0}, "size": {"x": 5, "y": 5}, "data": "7n3vAQ=="},
        img: {url: "tele-cam.png"},
        name: "Camelot",
      },
      {
        id: "camelot-seers",
        target: {"origin": {"x": 2704, "y": 3481, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-cam-seers.png"},
        name: "Camelot (Seer's Village)",
      },
      {
        id: "varrock",
        target: {"origin": {"x": 3210, "y": 3432, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-var.png"},
        name: "Varrock",
      },
      {
        id: "varrock-ge",
        target: {"origin": {"x": 3162, "y": 3462, "level": 0}, "size": {"x": 2, "y": 5}},
        icon_position_override: {"x": 3162, "y": 3462, "level": 0},
        img: {url: "tele-var-ge.png"},
        name: "Varrock (Grand Exchange)",
      },
      {
        id: "varrock-church",
        target: {"origin": {"x": 3245, "y": 3478, "level": 0}, "size": {"x": 4, "y": 5}},
        img: {url: "tele-var-church.png"},
        name: "Varrock (Church)",
      },
      {
        id: "watchtower",
        target: {"origin": {"x": 2547, "y": 3111, "level": 2}, "size": {"x": 4, "y": 4}, "data": "88w="},
        img: {url: "tele-watch.png"},
        name: "Watchtower",
      },
      {
        id: "watchtower-yanille",
        target: {"origin": {"x": 2573, "y": 3087, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-watch-center.png"},
        name: "Watchtower (Yanille)",
      },
      {
        id: "lumbridge",
        target: {"origin": {"x": 3217, "y": 3246, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/3/vAQ=="},
        img: {url: "tele-lum.png"},
        name: "Lumbridge",
      },
      {
        id: "falador",
        target: {"origin": {"x": 2963, "y": 3376, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-fal.png"},
        name: "Falador",
      },
      {
        id: "ardougne",
        target: {"origin": {"x": 2659, "y": 3300, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/v//AQ=="},
        img: {url: "tele-ard.png"},
        name: "Ardougne",
      },
      {
        id: "southfeldiphills",
        target: {"origin": {"x": 2411, "y": 2845, "level": 0}, "size": {"x": 5, "y": 5}, "data": "nP//AQ=="},
        icon_position_override: {"x": 2411, "y": 2847, "level": 0},
        img: {url: "tele-mob.png"},
        name: "South Feldip Hills",
      },
      {
        id: "taverley",
        target: {"origin": {"x": 2910, "y": 3421, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-taverley.png"},
        name: "Taverley",
      },
      {
        id: "godwars",
        target: {"origin": {"x": 2908, "y": 3712, "level": 0}, "size": {"x": 3, "y": 4}},
        img: {url: "tele-god.png"},
        name: "God Wars",
      },
      {
        id: "trollheim",
        target: {"origin": {"x": 2880, "y": 3666, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//v/AQ=="},
        img: {url: "tele-troll.png"},
        name: "Trollheim",
      },
      {
        id: "apeatoll",
        target: {"origin": {"x": 2795, "y": 2797, "level": 1}, "size": {"x": 5, "y": 3}},
        img: {url: "tele-ape.png"},
        name: "Ape Atoll",
      },
      {
        id: "mazcab",
        target: {"origin": {"x": 4314, "y": 817, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-mazcab.png"},
        name: "Mazcab",
      },
      {
        id: "northwesternanachronia",
        target: {"origin": {"x": 5314, "y": 2492, "level": 0}, "size": {"x": 5, "y": 5}, "data": "573PAQ=="},
        img: {url: "tele-northwesternanachronia.png"},
        name: "Western Anachronia",
      },
      {
        id: "easternanachronia",
        target: {"origin": {"x": 5598, "y": 2329, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-easternanachronia.png"},
        name: "Eastern Anachronia",
      },
      {
        id: "northlostgrove",
        target: {"origin": {"x": 1402, "y": 5723, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/3vvAQ=="},
        img: {url: "tele-northlostgrove.png"},
        name: "Lost Grove",
      },
    ],
    access: [{
      id: "spellbook",
      type: "spellbook",
      name: "Normal Spellbook"
    }] // TODO: Tablets
  },
  {
    type: "teleports",
    id: "ancientspellook",
    name: "Ancient Spellbook",
    img: {url: ""},
    menu_ticks: 0,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "paddewwa",
        target: {"origin": {"x": 3096, "y": 9880, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-paddewwa.png", width: 28, height: 28},
        name: "Paddewwa",
      },
      {
        id: "senntisten",
        target: {"origin": {"x": 3375, "y": 3400, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-senntisten.png"},
        name: "Senntisten",
      },
      {
        id: "kharyll",
        target: {"origin": {"x": 3499, "y": 3482, "level": 0}, "size": {"x": 5, "y": 4}, "data": "/38E"},
        img: {url: "tele-kharyrll.png"},
        name: "Kharyrll",
      },
      {
        id: "lassar",
        target: {"origin": {"x": 3002, "y": 3468, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-lassar.png"},
        name: "Lassar",
      },
      {
        id: "dareeyak",
        target: {"origin": {"x": 2966, "y": 3694, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///PAA=="},
        img: {url: "tele-dareeyak.png"},
        name: "Dareeyak",
      },
      {
        id: "carallaner",
        target: {"origin": {"x": 3220, "y": 3664, "level": 0}, "size": {"x": 5, "y": 5}, "data": "zv9zAA=="},
        img: {url: "tele-carrallaner.png"},
        name: "Carrallanger",
      },
      {
        id: "annakarl",
        target: {"origin": {"x": 3286, "y": 3884, "level": 0}, "size": {"x": 4, "y": 5}, "data": "f3cP"},
        img: {url: "tele-annakarl.png"},
        name: "Annakarl",
      },
      {
        id: "ghorrock",
        target: {"origin": {"x": 2974, "y": 3870, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-ghorrock.png"},
        name: "Ghorrock",
      },
    ],
    access: [{
      id: "spellbook",
      type: "spellbook",
      name: "Ancient Spellbook" // TODO: Tablets
    }]
  },
  {
    type: "teleports",
    id: "lunarspellbook",
    name: "Lunar Spellbook",
    menu_ticks: 0,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "moonclan",
        target: {"origin": {"x": 2112, "y": 3913, "level": 0}, "size": {"x": 4, "y": 5}, "data": "//8H"},
        img: {url: "tele-moonclan.png"},
        name: "Moonclan",
      },
      {
        id: "ourania",
        target: {"origin": {"x": 2465, "y": 3243, "level": 0}, "size": {"x": 5, "y": 5}, "data": "3v//AQ=="},
        img: {url: "tele-ourania.png"},
        name: "Ourania Altar",
      },
      {
        id: "southfalador",
        target: {"origin": {"x": 3053, "y": 3308, "level": 0}, "size": {"x": 5, "y": 5}, "data": "+f9PAQ=="},
        img: {url: "tele-southfalador.png"},
        name: "South Falador",
      },
      {
        id: "waterbirth",
        target: {"origin": {"x": 2544, "y": 3754, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-waterbirth.png"},
        name: "Waterbirth",
      },
      {
        id: "barbarian",
        target: {"origin": {"x": 2541, "y": 3567, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-barbarian.png"},
        name: "Barbarian",
      },
      {
        id: "northardougne",
        target: {"origin": {"x": 2663, "y": 3373, "level": 0}, "size": {"x": 4, "y": 5}, "data": "ZnYP"},
        img: {url: "tele-northardougne.png"},
        name: "North Ardougne",
      },
      {
        id: "khazard",
        target: {"origin": {"x": 2634, "y": 3165, "level": 0}, "size": {"x": 5, "y": 5}, "data": "8P//AQ=="},
        img: {url: "tele-khazard.png"},
        name: "Khazard",
      },
      {
        id: "fishing",
        target: {"origin": {"x": 2611, "y": 3381, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-fishing.png"},
        name: "Fishing Guild",
      },
      {
        id: "catherby",
        target: {"origin": {"x": 2788, "y": 3450, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/v/vAQ=="},
        img: {url: "tele-catherby.png"},
        name: "Catherby",
      },
      {
        id: "iceplateu",
        target: {"origin": {"x": 2973, "y": 3936, "level": 0}, "size": {"x": 4, "y": 5}},
        img: {url: "tele-iceplateau.png"},
        name: "Ice Plateau",
      },
      {
        id: "trollheim",
        target: {"origin": {"x": 2815, "y": 3674, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "tele-trollheim.png"},
        name: "Trollheim Farm",
      },
      {
        id: "westernkharazi",
        target: {"origin": {"x": 2801, "y": 2915, "level": 0}, "size": {"x": 5, "y": 5}, "data": "cf//AQ=="},
        img: {url: "tele-westernkharazi.png"},
        name: "Western Kharazi Jungle",
      },
      {
        id: "mountaincamp",
        target: {"origin": {"x": 2783, "y": 3662, "level": 0}, "size": {"x": 5, "y": 5}, "data": "EL8NAQ=="},
        img: {url: "tele-mountaincamp.png"},
        name: "Mountain Camp",
      },
    ],
    access: [{
      id: "spellbook",
      type: "spellbook",
      name: "Lunar Spellbook"
    }]
  },
  {
    type: "teleports",
    id: "greenteleport",
    name: "Green Teleports",
    spots: [
      {
        id: "monastery",
        target: {"origin": {"x": 2604, "y": 3212, "level": 0}, "size": {"x": 5, "y": 11}, "data": "zjn3/yeEEA=="},
        img: {url: "monastery.png"},
        name: "Kandarin Monastery",
        menu_ticks: 0,
        animation_ticks: 5
      },
      {
        id: "wars",
        target: {"origin": {"x": 3294, "y": 10127, "level": 0}},
        img: {url: "warsretreat.png"},
        facing: direction.north,
        name: "Wars Retreat",
        menu_ticks: 0,
        animation_ticks: default_teleport_ticks
      },
      {
        id: "manorfarm",
        target: {"origin": {"x": 2665, "y": 3369, "level": 0}, "size": {"x": 9, "y": 11}, "data": "+PDh64cPHj58+PDjBw=="},
        img: {url: "pof.png"},
        name: "Manor Farm",
        menu_ticks: 0,
        animation_ticks: 5
      },
      {
        id: "maxguild",
        target: {"origin": {"x": 2276, "y": 3313, "level": 1}},
        facing: direction.south,
        img: {url: "max.png"},
        name: "Max guild",
        menu_ticks: 0,
        animation_ticks: 7
      },
      {
        id: "maxguild-garden",
        target: {"origin": {"x": 2276, "y": 3327, "level": 1}},
        facing: direction.south,
        img: {url: "max.png"},
        name: "Max guild",
        menu_ticks: 0,
        animation_ticks: 7
      },
      {
        id: "skelettalhorror",
        target: {"origin": {"x": 3362, "y": 3503, "level": 0}},
        img: {url: "skhorror.png"},
        name: "Skeletal Horror",
        menu_ticks: 0,
        animation_ticks: default_teleport_ticks
      },
    ],
    access: [{
      id: "spellbook",
      type: "spellbook",
      name: "Any Spellbook"
    }]
  },
  {
    type: "teleports",
    id: "houseteleports", // house teleport timings assume the spell, tablets are two ticks slower
    name: "House Teleports",
    spots: [
      {
        id: "rimmington",
        target: {"origin": {"x": 2953, "y": 3222, "level": 0}, "size": {"x": 4, "y": 5}},
        name: "Rimmington",
        code: "1",
      },
      {
        id: "taverley",
        target: {"origin": {"x": 2882, "y": 3450, "level": 0}, "size": {"x": 5, "y": 5}},
        name: "Taverley",
        code: "2",
      },
      {
        id: "pollnivneach",
        target: {"origin": {"x": 3338, "y": 3003, "level": 0}, "size": {"x": 5, "y": 4}},
        name: "Pollnivneach",
        code: "3",
      },
      {
        id: "relekka",
        target: {"origin": {"x": 2668, "y": 3631, "level": 0}, "size": {"x": 5, "y": 4}, "data": "//8H"},
        name: "Rellekka",
        code: "4",
      },
      {
        id: "brimhaven",
        target: {"origin": {"x": 2757, "y": 3176, "level": 0}, "size": {"x": 4, "y": 5}},
        name: "Brimhaven",
        code: "5",
      },
      {
        id: "yanille",
        target: {"origin": {"x": 2542, "y": 3093, "level": 0}, "size": {"x": 5, "y": 4}},
        name: "Yanille",
        code: "6",
      },
      {
        id: "trollheim",
        target: {"origin": {"x": 2889, "y": 3672, "level": 0}, "size": {"x": 5, "y": 5}, "data": "zv//AQ=="},
        name: "Trollheim",
        code: "7",
      },
      {
        id: "prifddinas",
        target: {"origin": {"x": 2166, "y": 3333, "level": 1}, "size": {"x": 5, "y": 5}, "data": "cf//AQ=="},
        name: "Prifddinas",
        code: "8",
      },
      {
        id: "otot",
        target: {"origin": {"x": 4193, "y": 919, "level": 0}, "size": {"x": 5, "y": 3}},
        name: "Otot (Mazcab)",
        code: "9",
      },
      {
        id: "menaphos",
        target: {"origin": {"x": 3123, "y": 2633, "level": 0}, "size": {"x": 3, "y": 3}, "data": "lwA="},
        name: "Menaphos",
        code: "0,1",
      },
      {
        id: "anachronia",
        target: {"origin": {"x": 5434, "y": 2374, "level": 0}, "size": {"x": 5, "y": 5}, "data": "5PyPAA=="},
        name: "Anachronia",
        code: "0,2",
      },
    ],
    access: [
      {
        id: "spellbook",
        type: "spellbook",
        name: "Normal Spellbook",
        img: {url: "tele-house.png"},
        menu_ticks: 0,
        animation_ticks: default_teleport_ticks
      },
      {
        id: "tablets",
        type: "item",
        name: {
          kind: "item",
          name: "House Teleport Tablet",
        },
        img: {url: "modhouse.png"},
        action_name: "Break",
        menu_ticks: 0,
        animation_ticks: default_teleport_ticks + 2
      },
    ]
  },
  {
    type: "teleports",
    id: "teleportscrolls",
    name: "Teleport Scrolls",
    animation_ticks: 5,
    spots: [
      {
        id: "grandexchange",
        target: {"origin": {"x": 3159, "y": 3454, "level": 0}, "size": {"x": 4, "y": 5}, "data": "7u4D"},
        img: {url: "scroll-grandexchange.png"},
        name: "Grand Exchange",
        code: "1",
      },
      {
        id: "banditcamp",
        target: {"origin": {"x": 3168, "y": 2980, "level": 0}, "size": {"x": 5, "y": 5}},
        img: {url: "scroll-banditcamp.png"},
        name: "Bandit Camp",
        code: "2",
      },
      {
        id: "clocktower",
        target: {"origin": {"x": 2591, "y": 3250, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/3/nAA=="},
        img: {url: "scroll-clocktower.png"},
        name: "Clocktower",
        code: "3",
      },
      {
        id: "gutanoth",
        target: {"origin": {"x": 2521, "y": 3060, "level": 0}, "size": {"x": 5, "y": 5}, "data": "hPz/AQ=="},
        img: {url: "scroll-gutanoth.png"},
        name: "Gu'Tanoth",
        code: "4",
      },
      {
        id: "lighthouse",
        target: {"origin": {"x": 2511, "y": 3626, "level": 0}, "size": {"x": 5, "y": 5}, "data": "8L8RAA=="},
        img: {url: "scroll-lighthouse.png"},
        name: "Lighthouse",
        code: "5",
      },
      {
        id: "fortforinthry",
        target: {"origin": {"x": 3301, "y": 3548, "level": 0}, "size": {"x": 5, "y": 5}, "data": "UP//AQ=="},
        img: {url: "scroll-fortforinthry.png"},
        name: "Forintry Teleport",
        code: "6",
      },
      {
        id: "miscellania",
        target: {"origin": {"x": 2511, "y": 3858, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//8/AQ=="},
        img: {url: "scroll-miscellania.png"},
        name: "Miscellania",
        code: "7",
      },
      {
        id: "phoenixlair",
        target: {"origin": {"x": 2291, "y": 3620, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/v//AA=="},
        img: {url: "scroll-phoenixlair.png"},
        name: "Phoenix Lair",
        code: "8",
      },
      {
        id: "pollnivneach",
        target: {"origin": {"x": 3357, "y": 2967, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//+fAQ=="},
        img: {url: "scroll-pollnivneach.png"},
        name: "Pollnivneach",
        code: "9",
      },
      {
        id: "taibwowannai",
        target: {"origin": {"x": 2802, "y": 3084, "level": 0}, "size": {"x": 5, "y": 5}, "data": "5/9/AA=="},
        img: {url: "scroll-taibwowannai.png"},
        name: "Tai Bwo Wannai",
        code: "0",
      },

    ],
    access: [{
      id: "scroll",
      type: "item",
      name: {name: "Scroll", kind: "item"},
      action_name: "Teleport",
      menu_ticks: 0,
    }, {
      id: "globetrotter",
      type: "item",
      name: {name: "Globetrotter arm guards", kind: "item"},
      action_name: "Teleport",
      menu_ticks: 1
    }]
  },
  {
    type: "teleports",
    id: "teleportseed",
    name: "Teleport Seed",
    img: {url: "crystal.png"},
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "lletya",
        target: {"origin": {"x": 2328, "y": 3169, "level": 0}, "size": {"x": 5, "y": 5}, "data": "EP+PAQ=="},
        name: "Lletya",
        code: "1",
      },
      {
        id: "templeoflight",
        target: {"origin": {"x": 1938, "y": 4639, "level": 0}, "size": {"x": 5, "y": 5}},
        name: "Temple of Light",
        code: "2",
      },
      {
        id: "amlodd",
        target: {"origin": {"x": 2153, "y": 3381, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Amlodd",
        code: "3",
      },
      {
        id: "cadarn",
        target: {"origin": {"x": 2259, "y": 3337, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Cadarn",
        code: "4",
      },
      {
        id: "crwys",
        target: {"origin": {"x": 2259, "y": 3381, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Crwys",
        code: "5",
      },
      {
        id: "hefin",
        target: {"origin": {"x": 2184, "y": 3409, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Hefin",
        code: "6",
      },
      {
        id: "iorwerth",
        target: {"origin": {"x": 2183, "y": 3309, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Iorwerth",
        code: "7",
      },
      {
        id: "Ithell",
        target: {"origin": {"x": 2153, "y": 3337, "level": 1}, "size": {"x": 5, "y": 5}, "data": "///vAQ=="},
        name: "Ithell",
        code: "8",
      },
      {
        id: "Meilyr",
        target: {"origin": {"x": 2228, "y": 3409, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Meilyr",
        code: "9",
      },
      {
        id: "Trahaearn",
        target: {"origin": {"x": 2229, "y": 3309, "level": 1}, "size": {"x": 5, "y": 5}, "data": "7///AA=="},
        name: "Trahaearn",
        code: "0",
      },
    ],
    access: [{
      id: "attunedseed",
      type: "item",
      name: {name: "Attuned crystal teleport seed", kind: "item"},
      action_name: "Activate"
    }]
  },
  {
    type: "teleports",
    id: "menaphostablets",
    name: "Menaphos Tablets",
    img: {url: ""},
    menu_ticks: 0,
    animation_ticks: default_teleport_ticks + 2,
    spots: [
      {
        id: "imperial",
        target: {"origin": {"x": 3174, "y": 2727, "level": 0}, "size": {"x": 4, "y": 5}},
        img: {url: "imperialdistrict.gif"},
        icon_position_override: {"x": 3174, "y": 2731, "level": 0},
        name: "Imperial district",
        code: "1",
      },
      {
        id: "merchant",
        target: {"origin": {"x": 3206, "y": 2781, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///3AA=="},
        img: {url: "merchantdistrict.gif"},
        name: "Merchant district",
        code: "2",
      },
      {
        id: "port",
        target: {"origin": {"x": 3184, "y": 2652, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/v//AQ=="},
        img: {url: "portdistrict.gif"},
        name: "Port district",
        code: "3",
      },
      {
        id: "worker",
        target: {"origin": {"x": 3154, "y": 2794, "level": 0}, "size": {"x": 5, "y": 5}, "data": "UP//AQ=="},
        img: {url: "workerdistrict.gif"},
        icon_position_override: {"x": 3154, "y": 2798, "level": 0},
        name: "Worker district",
        code: "4",
      },
      {
        id: "sophanem",
        target: {"origin": {"x": 3287, "y": 2706, "level": 0}, "size": {"x": 5, "y": 4}, "data": "/38M"},
        img: {url: "sophanemdungeon.gif"},
        name: "Sophanem Slayer Dungeon",
        code: "5",
      },
      {
        id: "shiftingtombs",
        target: {"origin": {"x": 2076, "y": 6950, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/3/vAQ=="},
        icon_position_override: {"x": 2078, "y": 6954, "level": 0},
        img: {url: "shiftingtombs.webp"},
        name: "Menaphos shifting tombs",
        code: "6",
      },
    ],
    access: [{
      id: "tablet",
      type: "item",
      name: {name: "Tablet", kind: "item"},
      action_name: "Break",
    }]
  },
  {
    type: "teleports",
    id: "spirittree",
    name: "Spirit Tree",
    img: {url: "spirittree.png"},
    animation_ticks: 7,
    spots: [
      {
        id: "village",
        target: {origin: {x: 2542, y: 3169, level: 0}},
        name: "Tree Gnome Village",
        code: "1",
      },
      {
        id: "stronghold",
        target: {origin: {x: 2462, y: 3444, level: 0}},
        name: "Tree Gnome Stronghold",
        code: "2",
      },
      {
        id: "battlefield",
        target: {origin: {"x": 2557, "y": 3259, "level": 0}},
        name: "Battlefield of Khazard",
        code: "3",
      },
      {
        id: "grandexchange",
        target: {origin: {"x": 3187, "y": 3507, "level": 0}},
        name: "Grand Exchange",
        code: "4",
      },
      {
        id: "feldiphills",
        target: {origin: {"x": 2416, "y": 2851, "level": 0}},
        name: "South Feldip Hills",
        code: "5",
      },
      {
        id: "sarim",
        target: {origin: {"x": 3058, "y": 3257, "level": 0}},
        name: "Port Sarim",
        code: "6",
      },
      {
        id: "etceteria",
        target: {origin: {"x": 2613, "y": 3855, "level": 0}},
        name: "Etceteria",
        code: "7",
      },
      {
        id: "brimhaven",
        target: {origin: {"x": 2800, "y": 3203, "level": 0}},
        name: "Brimhaven",
        code: "8",
      },
      {
        id: "poisonwaste",
        target: {origin: {"x": 2338, "y": 3109, "level": 0}},
        name: "Poison Waste",
        code: "9",
      },
      {
        id: "prifddinas",
        target: {origin: {"x": 2275, "y": 3371, "level": 1}},
        name: "Prifddinas",
        code: "0",
      },

    ],
    access: [{
      id: "spirittreererooter",
      type: "item",
      name: {
        kind: "item",
        name: "Spirit tree re-rooter"
      },
      action_name: "Teleport",
      menu_ticks: 2,
    }]
  },
  {
    type: "teleports",
    id: "fairyring",
    name: "Fairy Ring", // assume favorite for menu times
    img: {url: "fairyring.png"},
    animation_ticks: 5,
    spots: [
      {
        id: "AIP",
        target: {origin: {x: 2412, y: 4434, level: 0}},
        code: "",
        name: "Zanaris",
      },
      {
        id: "AIQ",
        target: {origin: {x: 2996, y: 3114, level: 0}},
        code: "AIQ",
        name: "Asgarnia: Mudskipper Point",
      },
      {
        id: "AIR",
        target: {origin: {x: 2700, y: 3247, level: 0}},
        code: "AIR",
        name: "Islands: South of Witchhaven",
      },
      {
        id: "AIS",
        target: {origin: {x: 2030, y: 5982, level: 0}},
        code: "AIS",
        name: "Other realms: Naragi homeworld",
      },
      {
        id: "AJQ",
        target: {origin: {x: 2735, y: 5221, level: 0}},
        code: "AJQ",
        name: "Dungeons: Dark cave south of Dorgesh-Kaan",
      },
      {
        id: "AJR",
        target: {origin: {x: 2780, y: 3613, level: 0}},
        code: "AJR",
        name: "Kandarin: Slayer cave south-east of Relekka",
      },
      {
        id: "AJS",
        target: {origin: {x: 2500, y: 3896, level: 0}},
        code: "AJS",
        name: "Islands: Penguins near Miscellania",
      },
      {
        id: "AKQ",
        target: {origin: {x: 2319, y: 3619, level: 0}},
        code: "AKQ",
        name: "Piscatoris Hunter area",
      },
      {
        id: "AKS",
        target: {origin: {x: 2571, y: 2956, level: 0}},
        code: "AKS",
        name: "Feldip Hills: Jungle Hunter area",
      },
      {
        id: "ALP",
        target: {"origin": {"x": 2468, "y": 4189, "level": 0}},
        code: "ALP",
        name: "Feldip Hills: Near Gu´Tanoth",
      },
      {
        id: "ALQ",
        target: {origin: {x: 3597, y: 3495, level: 0}},
        code: "ALQ",
        name: "Morytania: Haunted Woods east of Canifis",
      },
      {
        id: "ALR",
        target: {origin: {x: 3059, y: 4875, level: 0}},
        code: "ALR",
        name: "Other realmms: Abyss",
      },
      {
        id: "ALS",
        target: {origin: {x: 2644, y: 3495, level: 0}},
        code: "ALS",
        name: "Kandarin: McGrubor´s Wood",
      },
      {
        id: "BIP",
        target: {origin: {x: 3410, y: 3324, level: 0}},
        code: "BIP",
        name: "Islands: Polypore Dungeon",
      },
      {
        id: "BIQ",
        target: {origin: {x: 3251, y: 3095, level: 0}},
        code: "BIQ",
        name: "Kharidian Desert: Near Kalphite Hive",
      },
      {
        id: "BIR",
        target: {origin: {x: 2455, y: 4396, level: 0}},
        code: "BIS",
        name: "Sparse Plane",
      },
      {
        id: "BIS",
        target: {origin: {x: 2635, y: 3266, level: 0}},
        code: "BIS",
        name: "Kandarin: Ardougne Zoo unicorns",
      },
      {
        id: "BJP",
        target: {"origin": {"x": 3347, "y": 3540, "level": 0}},
        code: "BJP",
        name: "Fort Forinthry",
      },
      {
        id: "BJQ",
        target: {origin: {x: 1737, y: 5342, level: 0}},
        code: "BJQ",
        name: "Dungeons: Ancient Cavern",
      },
      {
        id: "BJR",
        target: {origin: {x: 2650, y: 4730, level: 0}},
        code: "BJR",
        name: "Other realms: Realm of the fisher king",
      },
      {
        id: "BJS",
        target: {origin: {x: 1359, y: 5635, level: 0}},
        code: "BJS",
        name: "The Lost Grove",
      },
      {
        id: "BKP",
        target: {origin: {x: 2385, y: 3035, level: 0}},
        code: "BKP",
        name: "Feldip Hills: South of Castle Wars",
      },
      {
        id: "BKQ",
        target: {origin: {x: 3041, y: 4532, level: 0}},
        code: "BKQ",
        name: "Other realms: Enchanted Valley",
      },
      {
        id: "BKR",
        target: {origin: {x: 3469, y: 3431, level: 0}},
        code: "BKR",
        name: "Morytania: Mort Myre, south of Canifis",
      },
      {
        id: "BLP",
        target: {origin: {x: 4622, y: 5147, level: 0}},
        code: "BLP",
        name: "Dungeons: TzHaar area",
      },
      {
        id: "BLR",
        target: {origin: {x: 2740, y: 3351, level: 0}},
        code: "BLR",
        name: "Kandarin: Legends' Guild",
      },
      {
        id: "CIP",
        target: {origin: {x: 2513, y: 3884, level: 0}},
        code: "CIP",
        name: "Islands: Miscellania",
      },
      {
        id: "CIQ",
        target: {origin: {x: 2528, y: 3127, level: 0}},
        code: "CIQ",
        name: "Kandarin: North-west of Yanille",
      },
      {
        id: "CIS",
        target: {origin: {x: 3419, y: 4772, level: 0}},
        code: "CIS",
        name: "Other realms: ScapeRune (Evil Bob´s island)",
      },
      {
        id: "CJR",
        target: {origin: {x: 2705, y: 3576, level: 0}},
        code: "CJR",
        name: "Kandarin: Sinclair Mansion (east)",
      },
      {
        id: "CJS",
        target: {origin: {x: 2901, y: 2930, level: 0}},
        code: "CJS",
        name: "Karamja: Kharazi Jungle",
      },
      {
        id: "CKP",
        target: {origin: {"x": 2075, "y": 4848, "level": 0}},
        code: "CKP",
        name: "Other realms: Cosmic entity´s plane"
      },
      {
        id: "CKQ",
        target: {origin: {x: 3086, y: 2704, level: 0}},
        code: "CKQ",
        name: "Menaphos: Imperial District",
      },
      {
        id: "CKR",
        target: {origin: {x: 2801, y: 3003, level: 0}},
        code: "CKR",
        name: "Karamja: South of Tai Bwo Wannai Village",
      },
      {
        id: "CKS",
        target: {origin: {x: 3447, y: 3470, level: 0}},
        code: "CKS",
        name: "Morytania: Canifis",
      },
      {
        id: "CLP",
        target: {origin: {x: 3082, y: 3206, level: 0}},
        code: "CLP",
        name: "Islands: South of Draynor Village",
      },
      {
        id: "CLS",
        target: {origin: {x: 2682, y: 3081, level: 0}},
        code: "CLS",
        name: "Islands: Jungle spiders near Yanille",
      },
      {
        id: "CLR",
        target: {origin: {x: 2735, y: 2742, level: 0}},
        code: "CLR",
        name: "Islands: Ape Atoll",
      },
      {
        id: "DIP",
        target: {origin: {x: 3763, y: 2930, level: 0}},
        code: "DIP",
        name: "Islands: Mos Le´Harmless",
      },
      {
        id: "DIR",
        target: {origin: {"x": 3038, "y": 5348, "level": 0}},
        code: "DIR",
        name: "Other realms: Gorak`s Plane"
      },
      {
        id: "kethsi",
        target: {origin: {"x": 4026, "y": 5699, "level": 0}},
        code: "DIR AKS",
        name: "Kethsi"
      },
      {
        id: "DIS",
        target: {origin: {x: 3092, y: 3137, level: 0}},
        code: "DIS",
        name: "Misthalin: Wizard´s Tower",
      },
      {
        id: "DJP",
        target: {origin: {x: 2658, y: 3230, level: 0}},
        code: "DJP",
        name: "Kandarin: Tower of Life",
      },
      {
        id: "DJR",
        target: {origin: {x: 2676, y: 3587, level: 0}},
        code: "DJR",
        name: "Kandarin: Sinclair Mansion (west)",
      },
      {
        id: "DJS",
        target: {origin: {x: 2130, y: 3369, level: 0}},
        code: "DJS",
        name: "Tirannwn: Prifddinas (Clan Amlodd)",
      },
      {
        id: "DKP",
        target: {origin: {x: 2900, y: 3111, level: 0}},
        code: "DKP",
        name: "Karamja: South of Musa Point",
      },
      {
        id: "DKQ",
        target: {origin: {"x": 4183, "y": 5726, "level": 0}},
        code: "DKQ",
        name: "Dungeons: Glacor Cave"
      },
      {
        id: "DKR",
        target: {origin: {x: 3129, y: 3496, level: 0}},
        code: "DKR",
        name: "Misthalin: Edgeville",
      },
      {
        id: "DKS",
        target: {origin: {x: 2744, y: 3719, level: 0}},
        code: "DKS",
        name: "Kandarin: Snowy Hunter area",
      },
      {
        id: "DLQ",
        target: {origin: {x: 3423, y: 3016, level: 0}},
        code: "DLQ",
        name: "Kharidian Desert: North of Nardah",
      },
      {
        id: "DLR",
        target: {origin: {x: 2213, y: 3099, level: 0}},
        code: "DLR",
        name: "Islands: Poison Waste south of Isafdar",
      },
      {
        id: "DLS",
        target: {origin: {x: 3501, y: 9821, level: 3}},
        name: "Dungeons: Myreque Hideout under The Hollows",
        code: "DLS",
      },
      {
        id: "resistance",
        target: {origin: {x: 2254, y: 4426, level: 0}},
        name: "Fairy Resistance HQ",
      },
      {
        id: "rift",
        target: {origin: {x: 1626, y: 4176, level: 0}},
        code: "BIR DIP CLR ALP",
        name: "Ork´s Rift",
      },
      {
        id: "BLQ",
        target: {origin: {"x": 2229, "y": 4244, "level": 1}},
        name: "Yu´biusk",
        code: "BLQ",
      },
    ],
    access: [{
      id: "portable_fairy_ring",
      type: "item",
      name: {
        kind: "item",
        name: "Portable Fairy Ring"
      },
      action_name: "Teleport",
      menu_ticks: 2, // Assumes favorite
    }]
  },
  {
    type: "teleports",
    id: "slayercape",
    name: "Slayer Cape",
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "mandrith",
        target: {"origin": {"x": 3050, "y": 3949, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "1",
        name: "Mandrith",
      },
      {
        id: "laniakea",
        target: {"origin": {"x": 5667, "y": 2136, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///PAQ=="},
        code: "2",
        name: "Laniakea",
      },
      {
        id: "morvran",
        target: {"origin": {"x": 2195, "y": 3327, "level": 1}, "size": {"x": 3, "y": 3}, "data": "TwA="},
        code: "3",
        name: "Morvran",
      },
      {
        id: "kuradal",
        target: {"origin": {"x": 1738, "y": 5310, "level": 1}, "size": {"x": 5, "y": 5}, "data": "/v/nAA=="},
        code: "4",
        name: "Kuradal",
      },
      {
        id: "lapalok",
        target: {"origin": {"x": 2868, "y": 2979, "level": 1}, "size": {"x": 3, "y": 5}, "data": "0jc="},
        code: "5",
        name: "Lapalok",
      },
      {
        id: "sumona",
        target: {"origin": {"x": 3357, "y": 2991, "level": 0}, "size": {"x": 5, "y": 5}, "data": "5nxjAA=="},
        code: "6",
        name: "Sumona",
      },
      {
        id: "chealdar",
        target: {"origin": {"x": 2443, "y": 4429, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/H9CAA=="},
        code: "7",
        name: "Chealdar",
      },
      {
        id: "mazchna",
        target: {"origin": {"x": 3506, "y": 3504, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "8",
        name: "Mazchna",
      },
      {
        id: "raptor",
        target: {"origin": {"x": 3290, "y": 3542, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "9",
        name: "The Raptor",
      },
      {
        id: "vannaka",
        target: {"origin": {"x": 3091, "y": 3476, "level": 0}, "size": {"x": 5, "y": 5}, "data": "3n/vAQ=="},
        code: "0,1",
        name: "Vannaka",
        menu_ticks: 2,
      },
      {
        id: "jacquelyn",
        target: {"origin": {"x": 3219, "y": 3222, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//8/AQ=="},
        code: "0,2",
        name: "Jacquelyn",
        menu_ticks: 2,
      },
      {
        id: "spria",
        target: {"origin": {"x": 2888, "y": 3545, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//8dAQ=="},
        code: "0,3",
        name: "Spria",
        menu_ticks: 2,
      },
    ], access: [
      {
        id: "cape",
        type: "item",
        name: {name: "Slayer cape", kind: "item"},
        img: {url: "capeslay.png"},
        action_name: "Teleport",
      }
    ]
  },
  {
    /* Notes: Apparently, the area is a 7 by 7 are centered on the tile directly in front of the entrance in most cases.
           Some that were moved in graphical updates have not been updated.

         */
    type: "teleports",
    id: "dungcape",
    name: "Dungeoneering Cape",
    animation_ticks: 4,
    spots: [
      {
        id: "edgevilledungeon",
        target: {"origin": {"x": 3130, "y": 9914, "level": 0}, "size": {"x": 5, "y": 4}, "data": "/z8H"},
        code: "1",
        name: "Edgeville Dungeon",
        menu_ticks: 1,
      },
      {
        id: "dwarvenmine",
        target: {"origin": {"x": 3034, "y": 9769, "level": 0}, "size": {"x": 4, "y": 7}, "data": "4v/vDg=="},
        code: "2",
        name: "Dwarven mine",
        menu_ticks: 1,
      },
      {
        id: "hillgiants",
        target: {"origin": {"x": 3101, "y": 9823, "level": 0}, "size": {"x": 7, "y": 7}, "data": "s9//////AQ=="},
        code: "3",
        name: "Hill giants",
        menu_ticks: 1,
      },
      {
        id: "karamjavolcano",
        target: {"origin": {"x": 2842, "y": 9555, "level": 0}, "size": {"x": 4, "y": 6}, "data": "4v+b"},
        code: "4",
        name: "Karamja volcano",
        menu_ticks: 1,
      },
      {
        id: "daemonheimpeninsula",
        target: {"origin": {"x": 3510, "y": 3663, "level": 0}, "size": {"x": 4, "y": 7}},
        code: "5",
        name: "Daemonheim Peninsula",
        menu_ticks: 1,
      },
      {
        id: "firegiants",
        target: {"origin": {"x": 2575, "y": 9895, "level": 0}, "size": {"x": 7, "y": 4}, "data": "////Bw=="},
        code: "6",
        name: "Waterfall fire giants",
        menu_ticks: 1,
      },
      {
        id: "miningguild",
        target: {"origin": {"x": 3019, "y": 9738, "level": 0}, "size": {"x": 7, "y": 4}, "data": "ZL7/Dw=="},
        code: "7",
        name: "Mining guild",
        menu_ticks: 1,
      },
      {
        id: "braindeath",
        target: {"origin": {"x": 2123, "y": 5144, "level": 0}, "size": {"x": 5, "y": 4}, "data": "730O"},
        code: "8",
        name: "Braindeath Island",
        menu_ticks: 1,
      },
      {
        id: "hellhounds",
        target: {"origin": {"x": 2854, "y": 9838, "level": 0}, "size": {"x": 4, "y": 7}, "data": "7v8/Aw=="},
        code: "9",
        name: "Taverley dungeon hellhounds",
        menu_ticks: 1,
      },
      {
        id: "bluedragons",
        target: {"origin": {"x": 2909, "y": 9807, "level": 0}, "size": {"x": 7, "y": 4}, "data": "+7+PAw=="},
        code: "0,1",
        name: "Taverley dungeon blue dragons",
        menu_ticks: 2,
      },
      {
        id: "varrocksewers",
        target: {"origin": {"x": 3162, "y": 9878, "level": 0}, "size": {"x": 6, "y": 4}, "data": "/u/7"},
        code: "0,2",
        name: "Varrock sewers",
        menu_ticks: 2,
      },
      {
        id: "dragontooth",
        target: {"origin": {"x": 3812, "y": 3528, "level": 0}},
        code: "0,3",
        name: "Dragontooth island",
        menu_ticks: 2,
      },
      {
        id: "chaostunnels",
        target: {"origin": {"x": 3157, "y": 5521, "level": 0}, "size": {"x": 7, "y": 4}, "data": "vP//Dw=="},
        code: "0,4",
        name: "Chaos Tunnels",
        menu_ticks: 2,
      },
      {
        id: "alkharidmine",
        target: {"origin": {"x": 3298, "y": 3304, "level": 0}, "size": {"x": 4, "y": 7}, "data": "7v//Dw=="},
        code: "0,5",
        name: "Al Kharid mine",
        menu_ticks: 2,
      },
      {
        id: "metaldragons",
        target: {"origin": {"x": 2697, "y": 9439, "level": 0}, "size": {"x": 4, "y": 7}},
        code: "0,6",
        name: "Brimhaven metal dragons",
        menu_ticks: 2,
      },
      {
        id: "polypore",
        target: {"origin": {"x": 4658, "y": 5488, "level": 3}, "size": {"x": 4, "y": 5}},
        code: "0,7",
        name: "Polypore dungeon",
        menu_ticks: 2,
      },
      {
        id: "frostdragons",
        target: {"origin": {"x": 3032, "y": 9596, "level": 0}, "size": {"x": 3, "y": 4}},
        code: "0,8",
        name: "Frost dragons",
        menu_ticks: 2,
      },
      {
        id: "kalgeriondemons",
        target: {"origin": {"x": 3398, "y": 3662, "level": 0}, "size": {"x": 4, "y": 5}, "data": "MfYB"},
        code: "0,9",
        name: "Daemonheim demons",
        menu_ticks: 2,
      },
      {
        id: "gorajohoardstalker",
        target: {"origin": {"x": 2231, "y": 3419, "level": 1}, "size": {"x": 6, "y": 6}, "data": "3///jwM="},
        code: "0,0,1",
        name: "Gorajo hoardstalker",
        menu_ticks: 3,
      },
      {
        id: "slayertower",
        target: {"origin": {"x": 3431, "y": 3528, "level": 0}, "size": {"x": 7, "y": 5}, "data": "///vEwA="},
        code: "0,0,2",
        name: "Slayer tower dungeon",
        menu_ticks: 3,
      },
      {
        id: "edimmu",
        target: {"origin": {"x": 2231, "y": 3393, "level": 1}, "size": {"x": 7, "y": 7}, "data": "j4fDj8fhAA=="},
        code: "0,0,3",
        name: "Edimmu dungeon",
        menu_ticks: 3,
      },
    ],
    access: [
      {
        id: "cape",
        type: "item",
        name: {name: "Dungeoneering cape", kind: "item"},
        img: {url: "capedung.png"},
        action_name: "Teleport",
      }
    ]
  },
  {
    type: "teleports",
    id: "questcape",
    name: "Quest Cape",
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "guthixtemple",
        target: {"origin": {"x": 2538, "y": 5771, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "1",
        name: "Ancient Guthix Temple",
      },
      {
        id: "behindthescenes",
        target: {"origin": {"x": 1181, "y": 5394, "level": 1}, "size": {"x": 5, "y": 5}, "data": "//8/AQ=="},
        code: "2",
        name: "Behind the scenes",
      },
      {
        id: "championsguild",
        target: {"origin": {"x": 3188, "y": 3359, "level": 0}, "size": {"x": 4, "y": 4}, "data": "d+8="},
        code: "3",
        name: "Champion's Guild",
      },
      {
        id: "emptythroneroom",
        target: {"origin": {"x": 2825, "y": 12626, "level": 2}, "size": {"x": 5, "y": 5}, "data": "4f9zAA=="},
        code: "4",
        name: "The empty throne room",
      },
      {
        id: "glacorcavern",
        target: {"origin": {"x": 4194, "y": 5750, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "5",
        name: "Glacor cavern",
      },
      {
        id: "heroesguild",
        target: {"origin": {"x": 2918, "y": 9892, "level": 0}, "size": {"x": 5, "y": 5}, "data": "xvszAA=="},
        code: "6",
        name: "Heroes's Guild - Fountain of Heroes",
      },
      {
        id: "legensguild",
        target: {"origin": {"x": 2726, "y": 3346, "level": 0}, "size": {"x": 5, "y": 4}},
        icon_position_override: {"x": 2730, "y": 3349, "level": 0},
        code: "7",
        name: "Legends' Guild",
      },
      {
        id: "tearsofguthix",
        target: {"origin": {"x": 3249, "y": 9515, "level": 2}, "size": {"x": 4, "y": 5}, "data": "9/8P"},
        code: "8",
        name: "Tears of Guthix",
      },
      {
        id: "museum",
        target: {"origin": {"x": 3252, "y": 3446, "level": 0}, "size": {"x": 5, "y": 5}, "data": "nr/fAQ=="},
        code: "9",
        name: "Varrock Museum",
      },
      {
        id: "worldgate",
        target: {"origin": {"x": 2365, "y": 3358, "level": 0}, "size": {"x": 5, "y": 5}, "data": "7v//AQ=="},
        code: "0",
        name: "The World Gate",
      },
    ],
    access: [
      {
        id: "cape",
        type: "item",
        name: {name: "Quest cape", kind: "item"},
        img: {url: "capequest.png"},
        action_name: "Teleport",
      }
    ]
  },/*
    {
        type: "teleports",
        id: "sixthage",
        name: "Sixth Age Circuit",
        img: {url: "sixthagecircuit.png"},
        spots: [
            {
                id: "shrine",
target: {origin: {x: 1928, y: 5987, level: 0}},
code: "1",
name: "Guthix's Shrine",
                menu_ticks: 2,
                animation_ticks: 5
            },
            {
                id: "worldgate",
target: {origin: {x: 2367, y: 3355, level: 0}},
code: "2",
name: "World Gate",
                menu_ticks: 2,
                animation_ticks: 5
            },
            {
                id: "memorial",
target: {origin: {x: 2265, y: 3554, level: 0}},
code: "3",
name: "Guthix Memorial",
                menu_ticks: 2,
                animation_ticks: 5
            },
            {
                id: "temple",
target: {origin: {x: 2540, y: 5772, level: 0}},
code: "4",
name: "Guthix Memorial",
                menu_ticks: 2,
                animation_ticks: 5
            },
        ]
    },*/
  {
    type: "teleports",
    id: "desertamulet",
    name: "Desert Amulet",
    menu_ticks: 2,
    animation_ticks: 6,
    spots: [
      {
        id: "nardah",
        target: {"origin": {"x": 3427, "y": 2912, "level": 0}, "size": {"x": 11, "y": 11}, "data": "4z////3vf///////+Mc/AA=="},
        code: "1",
        name: "Nardah",
      },
      {
        id: "uzer",
        target: {"origin": {"x": 3475, "y": 3093, "level": 0}, "size": {"x": 10, "y": 12}, "data": "wO//////////////////"},
        code: "2",
        name: "Uzer",
      },
    ],
    access: [
      {
        id: "amulet",
        type: "item",
        name: {name: "Desert amulet", kind: "item"},
        img: {url: "desertamulet.png"},
        action_name: "Teleport",
      }
    ]
  },
  {
    type: "teleports",
    id: "piratebook",
    name: "Big Book o´ Piracy",
    img: {url: "bookopiracy.gif"},
    menu_ticks: 1,
    animation_ticks: 13,
    spots: [
      {
        id: "mosleharmless",
        target: {"origin": {"x": 3684, "y": 2958, "level": 0}},
        code: "1",
        name: "Mos Le'Harmless",
      },
      {
        id: "braindeath",
        target: {"origin": {"x": 2162, "y": 5114, "level": 1}},
        code: "2",
        name: "Braindeath Island",
      },
      {
        id: "dragontooth",
        target: {"origin": {"x": 3792, "y": 3559, "level": 0}},
        code: "3",
        name: "Dragontooth Isle",
      },
      {
        id: "harmony",
        target: {"origin": {"x": 3797, "y": 2836, "level": 0}},
        code: "3",
        name: "Harmony Island",
      },
    ],
    access: [{
      id: "book",
      type: "item",
      name: {name: "Big Book o´ Piracy", kind: "item"},
      action_name: "Teleport",
    }]
  },
  {
    type: "teleports",
    id: "amuletofglory",
    name: "Amulet of Glory",
    img: {url: "jewellry_amuletofglory.png"},
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "edgeville",
        target: {"origin": {"x": 3087, "y": 3496, "level": 0}},
        code: "1",
        name: "Edgeville",
      },
      {
        id: "karamja",
        target: {"origin": {"x": 2918, "y": 3176, "level": 0}},
        code: "2",
        name: "Karamja",
      },
      {
        id: "draynor",
        target: {"origin": {"x": 3080, "y": 3250, "level": 0}},
        code: "3",
        name: "Draynor",
      },
      {
        id: "alkharid",
        target: {"origin": {"x": 3305, "y": 3123, "level": 0}},
        code: "4",
        name: "Al Kharid",
      },
    ],
    access: [{
      id: "necklace",
      type: "item",
      name: {name: "Amulet of glory", kind: "item"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "combatbracelet",
    name: "Combat bracelet",
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "warriors",
        target: {"origin": {"x": 2880, "y": 3542, "level": 0}},
        code: "1",
        name: "Warriors' Guild",
      },
      {
        id: "champions",
        target: {"origin": {"x": 3191, "y": 3365, "level": 0}},
        code: "2",
        name: "Champions' Guild",
      },
      {
        id: "monastery",
        target: {"origin": {"x": 3052, "y": 3488, "level": 0}},
        code: "3",
        name: "Edgeville Monastery",
      },
      {
        id: "ranging",
        target: {"origin": {"x": 2655, "y": 3441, "level": 0}},
        code: "4",
        name: "Ranging Guild",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Combat bracelet", kind: "item"},
      img: {url: "jewellry_combatbracelet.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "digsitependant",
    name: "Dig Site pendant",
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "digsite",
        target: {"origin": {"x": 3358, "y": 3396, "level": 0}},
        code: "1",
        name: "Digsite",
      },
      {
        id: "senntisten",
        target: {"origin": {"x": 3378, "y": 3444, "level": 0}},
        code: "2",
        name: "Senntisten",
      },
      {
        id: "exam",
        target: {"origin": {"x": 3362, "y": 3345, "level": 0}},
        code: "3",
        name: "Exam Centre",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Dig Site pendant", kind: "item"},
      img: {url: "jewellry_digsitependant.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "enlightenedamulet",
    name: "Enlightened amulet",
    menu_ticks: 2,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "nexus",
        target: {"origin": {"x": 3215, "y": 3180, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//+/AQ=="},
        code: "1",
        name: "Nexus",
      },
      {
        id: "graveyard",
        target: {"origin": {"x": 3231, "y": 3655, "level": 0}, "size": {"x": 4, "y": 5}, "data": "f3cP"},
        code: "2",
        name: "Graveyard of Shadows"
      },
      {
        id: "banditcamp",
        target: {"origin": {"x": 3169, "y": 2994, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "3",
        name: "Bandit camp"
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Enlightened amulet", kind: "item"},
      img: {url: "jewellry_enlightenedamulet.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "gamesnecklace",
    name: "Games necklace",
    img: {url: "jewellry_gamesnecklace.png"},
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "trollinvasion",
        target: {"origin": {"x": 2874, "y": 3567, "level": 0}},
        code: "1",
        name: "Troll invasion",
      },
      {
        id: "barbarianoutpost",
        target: {"origin": {"x": 2520, "y": 3571, "level": 0}},
        code: "2",
        name: "Barbarian Outpost",
      },
      {
        id: "gamersgrotto",
        target: {"origin": {"x": 2967, "y": 9678, "level": 0}},
        code: "3",
        name: "Gamer's grotto",
      },
      {
        id: "agoroth",
        target: {"origin": {"x": 3860, "y": 6827, "level": 0}},
        code: "4",
        name: "Agoroth",
      },
      {
        id: "corporealbeast",
        target: {"origin": {"x": 2885, "y": 4372, "level": 2}},
        code: "5",
        name: "Corporeal Beast",
      },
      {
        id: "burghderott",
        target: {"origin": {"x": 3487, "y": 3237, "level": 0}},
        code: "6",
        name: "Burgh De Rott",
      },
      {
        id: "tearsofguthix",
        target: {"origin": {"x": 3250, "y": 9517, "level": 2}},
        code: "7",
        name: "Tears of Guthix",
      },
    ],
    access: [{
      id: "necklace",
      type: "item",
      name: {name: "Games necklace", kind: "item"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "ringofduelling",
    name: "Ring of duelling",
    img: {url: "jewellry_duelring.png"},
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "hetsoasis",
        target: {"origin": {"x": 3313, "y": 3235, "level": 0}, "size": {"x": 5, "y": 5}, "data": "+/v/AQ=="},
        code: "1",
        name: "Het's oasis",
      },
      {
        id: "castlewars",
        target: {"origin": {"x": 2442, "y": 3088, "level": 0}, "size": {"x": 5, "y": 5}, "data": "7/33AA=="},
        code: "2",
        name: "Castle wars",
      },
      {
        id: "warforge",
        target: {"origin": {"x": 2411, "y": 2845, "level": 0}, "size": {"x": 5, "y": 5}, "data": "nP//AQ=="},
        icon_position_override: {"x": 2415, "y": 2847, "level": 0},
        code: "3",
        name: "The Warforge",
      },
      {
        id: "fistofguthix",
        name: "Fist of Guthix",
        target: {"origin": {"x": 1690, "y": 5598, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "4"
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Ring of duelling", kind: "item"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "ringofrespawn",
    name: "Ring of respawn",
    menu_ticks: 2,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "lumbridge",
        target: {"origin": {"x": 3219, "y": 3217, "level": 0}, "size": {"x": 5, "y": 5}, "data": "7X/GAA=="},
        code: "1",
        name: "Lumbridge",
      },
      {
        id: "falador",
        target: {"origin": {"x": 2969, "y": 3337, "level": 0}, "size": {"x": 5, "y": 4}, "data": "/3sP"},
        code: "2",
        name: "Falador",
      },
      {
        id: "camelot",
        target: {"origin": {"x": 2756, "y": 3478, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/39jAA=="},
        code: "3",
        name: "Camelot",
      },
      {
        id: "soulwars",
        target: {"origin": {"x": 1888, "y": 3176, "level": 0}, "size": {"x": 5, "y": 4}, "data": "/38M"},
        code: "4",
        name: "Soul Wars",
      },
      {
        id: "burthorpe",
        target: {"origin": {"x": 2887, "y": 3535, "level": 0}, "size": {"x": 3, "y": 4}, "data": "/g8="},
        code: "5",
        name: "Burthorpe",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Ring of respawn", kind: "item"},
      img: {url: "jewellry_ringofrespawn.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "ringofslaying",
    name: "Ring of slaying",
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "sumona",
        target: {"origin": {"x": 3359, "y": 2991, "level": 0}, "size": {"x": 4, "y": 5}, "data": "zM8M"},
        code: "1",
        name: "Sumona"
      },
      {
        id: "slayertower",
        target: {"origin": {"x": 3418, "y": 3522, "level": 0}, "size": {"x": 4, "y": 4}, "data": "78Y="},
        code: "2",
        name: "Slayer Tower",
      },
      {
        id: "slayerdungeon",
        target: {"origin": {"x": 2788, "y": 3613, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "3",
        name: "Fremennik Slayer Dungeon",
      },
      {
        id: "tarnslair",
        target: {"origin": {"x": 3183, "y": 4599, "level": 0}, "size": {"x": 5, "y": 3}, "data": "hHw="},
        code: "4",
        name: "Tarn's Lair",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Ring of slaying", kind: "item"},
      img: {url: "jewellry_ringofslaying.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "ringofwealth",
    name: "Ring of Wealth",
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "miscellania",
        target: {"origin": {"x": 2505, "y": 3858, "level": 1}, "size": {"x": 5, "y": 5}},
        code: "1",
        name: "Miscellania",
      },
      {
        id: "grandexchange",
        target: {"origin": {"x": 3162, "y": 3462, "level": 0}, "size": {"x": 2, "y": 5}},
        code: "2",
        name: "Grand Exchange",
      }
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Ring of Wealth", kind: "item"},
      img: {url: "jewellry_ringofwealth.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "luckofthedwarves",
    name: "Luck of the Dwarves",
    menu_ticks: 1,
    animation_ticks: 4,
    spots: [
      {
        id: "keldagrim",
        target: {"origin": {"x": 2856, "y": 10197, "level": 0}, "size": {"x": 5, "y": 5}, "data": "7v3nAA=="},
        code: "3",
        name: "Keldagrim",
      },
      {
        id: "outpost",
        target: {"origin": {"x": 2550, "y": 3473, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//+/AQ=="},
        code: "4",
        name: "Dwarven Outpost",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Luck of the Dwarves", kind: "item"},
      img: {url: "luck_of_the_dwarves.png"},
      action_name: "Rub",
    }]
  },
  {
    type: "teleports",
    id: "hazelmeressignetring",
    name: "Hazelmere's signet ring",
    menu_ticks: 0,
    animation_ticks: 4,
    spots: [
      {
        id: "hazelmere",
        target: {"origin": {"x": 2422, "y": 3394, "level": 0}, "size": {"x": 5, "y": 5}, "data": "+v//AQ=="},
        code: "4",
        name: "Hazelmere",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Hazelmere's signet ring", kind: "item"},
      img: {url: "Hazelmeres_signet_ring.webp"},
      action_name: "Rub",
    }]
  },
  {
    type: "teleports",
    id: "skillsnecklace",
    name: "Skills necklace",
    menu_ticks: 2,
    animation_ticks: 4,
    spots: [
      {
        id: "fishing",
        target: {"origin": {"x": 2615, "y": 3385, "level": 0}},
        code: "1",
        name: "Fishing Guild"
      },
      {
        id: "mining",
        target: {origin: {"x": 3016, "y": 3338, "level": 0}},
        code: "2",
        name: "Mining Guild",
      },
      {
        id: "crafting",
        target: {"origin": {"x": 2935, "y": 3294, "level": 0}},
        code: "3",
        name: "Crafting Guild",
      },
      {
        id: "cooking",
        target: {"origin": {"x": 3143, "y": 3442, "level": 0}},
        code: "4",
        name: "Cooking Guild",
      },
      {
        id: "invention",
        target: {"origin": {"x": 2997, "y": 3437, "level": 0}},
        code: "5",
        name: "Invention guild",
      },
      {
        id: "farming",
        target: {"origin": {"x": 2646, "y": 3355, "level": 0}},
        code: "6",
        name: "Farming Guild",
      },
      {
        id: "runecrafting",
        target: {"origin": {"x": 3102, "y": 3152, "level": 3}},
        code: "7",
        name: "Runecrafting Guild",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Skills necklace", kind: "item"},
      img: {url: "jewellry_skillsnecklace.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    type: "teleports",
    id: "travellersnecklace",
    name: "Traveller's necklace",
    menu_ticks: 2,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "wizardstower",
        target: {"origin": {"x": 3101, "y": 3178, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///3AA=="},
        code: "1",
        name: "Wizard's Tower",
      },
      {
        id: "outpost",
        target: {"origin": {"x": 2445, "y": 3343, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "2",
        name: "The Outpost",
      },
      {
        id: "deserteagle",
        target: {"origin": {"x": 3422, "y": 3138, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//8fAQ=="},
        code: "3",
        name: "Desert Eagle's Eyrie",
      },
    ],
    access: [{
      id: "ring",
      type: "item",
      name: {name: "Traveller's necklace", kind: "item"},
      img: {url: "jewellry_travellersnecklace.png"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
  {
    id: "davesspellbook",
    type: "teleports",
    name: "Dave's spellbook",
    img: {url: "davebook.png"},
    spots: [
      {
        id: "watchtower",
        target: {origin: {"x": 2443, "y": 3180, "level": 0}},
        code: "1",
        name: "Watchtower",
      },
      {
        id: "camelot",
        target: {origin: {x: 2794, y: 3418, level: 0}},
        code: "2",
        name: "Camelot",
      },
      {
        id: "falador",
        target: {origin: {x: 3006, y: 3319, level: 0}},
        code: "3",
        name: "Falador",
      },
      {
        id: "ardougne",
        target: {origin: {x: 2538, y: 3306, level: 0}},
        code: "4",
        name: "Ardougne",
      },
      {
        id: "lumbridge",
        target: {origin: {x: 3168, y: 3199, level: 0}},
        code: "5",
        name: "Lumbridge",
      },
      {
        id: "varrock",
        target: {origin: {x: 3254, y: 3449, level: 0}},
        code: "6",
        name: "Varrock",
      },
    ],
    access: [{
      img: {url: "davebook.png"},
      id: "spellbook",
      type: "item",
      name: {kind: "item", name: "Dave's spellbook"},
      action_name: "Teleport",
      menu_ticks: 2,
      animation_ticks: 3,
    }]
  },
  {
    type: "teleports",
    id: "drakansmedallion",
    name: "Drakan's medallion",
    img: {url: "drakmed.gif"},
    menu_ticks: 1,
    animation_ticks: 5,
    spots: [
      {
        id: "barrows",
        target: {"origin": {"x": 3561, "y": 3311, "level": 0}, "size": {"x": 9, "y": 9}, "data": "EXb8+fMfPnz48AE="},
        code: "1",
        name: "Barrows",
      },
      {
        id: "burghderott",
        target: {"origin": {"x": 3492, "y": 3197, "level": 0}, "size": {"x": 9, "y": 7}, "data": "f/78/+9/PnA="},
        code: "2",
        name: "Burgh de Rott",
      },
      {
        id: "meiyerditch",
        target: {"origin": {"x": 3626, "y": 9617, "level": 0}, "size": {"x": 3, "y": 8}, "data": "3rbt"},
        code: "3",
        name: "Meiyerditch",
      },
      {
        id: "darkmeyer",
        target: {"origin": {"x": 3623, "y": 3364, "level": 0}, "size": {"x": 9, "y": 2}},
        code: "4",
        name: "Darkmeyer",
      },
      {
        id: "laboratories",
        target: {"origin": {"x": 3629, "y": 9691, "level": 0}, "size": {"x": 9, "y": 8}, "data": "wtjx4+//zx8Q"},
        code: "5",
        name: "Meiyerditch Laboratories",
      },
    ],
    access: [
      {id: "medallion", type: "item", name: {kind: "item", name: "Drakan's medallion"}, action_name: "Teleport"}
    ]
  },
  {
    type: "teleports",
    id: "arcsailing",
    name: "",
    img: {url: "sail.png"},
    menu_ticks: 1,
    animation_ticks: 1,
    spots: [
      {
        id: "portsarim",
        target: {"origin": {"x": 3052, "y": 3246, "level": 0}},
        name: "Port Sarim",
      },
      {
        id: "tualeit",
        target: {"origin": {"x": 1761, "y": 12010, "level": 0}},
        name: "Tua Leit Docks",
      },
      {
        id: "whalesmaw",
        target: {"origin": {"x": 2011, "y": 11782, "level": 0}},
        name: "Whale's Maw Docks",
      },
      {
        id: "waiko",
        target: {"origin": {"x": 1810, "y": 11652, "level": 0}},
        name: "Waiko Docks",
      },
      {
        id: "turtleislands",
        target: {"origin": {"x": 2242, "y": 11424, "level": 0}},
        name: "Turtle Islands Docks",
      },
      {
        id: "aminishi",
        target: {"origin": {"x": 2062, "y": 11271, "level": 0}},
        name: "Aminishi Docks",
      },
      {
        id: "cyclosis",
        target: {"origin": {"x": 2256, "y": 11180, "level": 0}},
        name: "Cyclosis Docks",
      },
      {
        id: "goshima",
        target: {"origin": {"x": 2453, "y": 11591, "level": 0}},
        name: "Goshima Docks",
      },
      {
        id: "uncharted",
        target: {"origin": {"x": 1203, "y": 7374, "level": 0}},
        name: "Uncharted Isle",
      },
    ],
    access: [
      {
        type: "entity",
        id: "port sarim",
        name: {kind: "npc", name: "Quartermaster Gully (Port Sarim)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 3054, "y": 3247, "level": 0}}
      },
      {
        type: "entity",
        id: "menaphos",
        name: {kind: "npc", name: "Quartermaster Gully (Menaphos)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 3231, "y": 2664, "level": 0}}
      },
      {
        type: "entity",
        id: "tuaeileit",
        name: {kind: "npc", name: "Quartermaster Gully (Tuaei Leit)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 1760, "y": 12010, "level": 0}}
      },
      {
        type: "entity",
        id: "whalesmaw",
        name: {kind: "npc", name: "Quartermaster Gully (Whale's Maw)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 2012, "y": 11781, "level": 0}}
      },
      {
        type: "entity",
        id: "Waiko",
        name: {kind: "npc", name: "Quartermaster Gully (Waiko)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 1809, "y": 11652, "level": 0}}
      },
      {
        type: "entity",
        id: "Turtle Islands",
        name: {kind: "npc", name: "Quartermaster Gully (Turtle Islands)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 2245, "y": 11423, "level": 0}}
      },
      {
        type: "entity",
        id: "Aminishi",
        name: {kind: "npc", name: "Quartermaster Gully (Aminishi)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 2061, "y": 11270, "level": 0}}
      },
      {
        type: "entity",
        id: "Cyclosis",
        name: {kind: "npc", name: "Quartermaster Gully (Cyclosis)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 2251, "y": 11182, "level": 0}}
      },
      {
        type: "entity",
        id: "Goshima",
        name: {kind: "npc", name: "Quartermaster Gully (Goshima)"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 2448, "y": 11593, "level": 0}}
      },
    ]
  },
  {
    type: "teleports",
    id: "arctabs",
    name: "Arc Journal",
    img: {url: "arcjournal.png"},
    menu_ticks: 1,
    animation_ticks: 3,
    spots: [
      {
        id: "sarim",
        target: {"origin": {"x": 3050, "y": 3245, "level": 0}, "size": {"x": 4, "y": 4}, "data": "/64="},
        name: "Port Sarim",
        code: "1",
      },
      {
        id: "waiko",
        target: {"origin": {"x": 1820, "y": 11613, "level": 0}, "size": {"x": 5, "y": 5}},
        name: "Waiko",
        code: "2",
      },
      {
        id: "whalesmaw",
        target: {"origin": {"x": 2058, "y": 11797, "level": 0}, "size": {"x": 5, "y": 4}, "data": "778H"},
        name: "Whale's Maw",
        code: "3",
      },
      {
        id: "aminishi",
        target: {"origin": {"x": 2085, "y": 11273, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//83AA=="},
        name: "Aminishi",
        code: "4",
      },
      {
        id: "cyclosis",
        target: {"origin": {"x": 2314, "y": 11222, "level": 0}, "size": {"x": 5, "y": 5}},
        name: "Cyclosis",
        code: "5",
      },
      {
        id: "tuaileit",
        target: {"origin": {"x": 1797, "y": 11959, "level": 0}, "size": {"x": 5, "y": 5}},
        name: "Tuai Leit",
        code: "6",
      },
      {
        id: "turtleislands",
        target: {"origin": {"x": 2277, "y": 11501, "level": 0}, "size": {"x": 3, "y": 5}, "data": "/j8="},
        name: "Turtle Islands",
        code: "7",
      },
      {
        id: "goshima",
        target: {"origin": {"x": 2459, "y": 11546, "level": 0}, "size": {"x": 4, "y": 2}, "data": "Lw=="},
        name: "Goshima",
        code: "8",
      },
    ],
    access: [{
      id: "journal",
      type: "item",
      name: {name: "Arc journal", kind: "item"},
      action_name: "Teleport",
    }]
  },
  {
    type: "teleports",
    id: "quiver",
    name: "Tirannwn quiver",
    menu_ticks: 1,
    animation_ticks: 5,
    spots: [
      {
        id: "lletya",
        target: {"origin": {"x": 2344, "y": 3169, "level": 0}, "size": {"x": 5, "y": 5}, "data": "5fx/AA=="},
        name: "Lletya",
        code: "1",
      },
      {
        id: "islwyn",
        target: {"origin": {"x": 2174, "y": 3349, "level": 1}, "size": {"x": 4, "y": 5}, "data": "xP8D"},
        name: "Islwyn",
        code: "2",
      },
      {
        id: "tyras",
        target: {"origin": {"x": 2184, "y": 3144, "level": 0}, "size": {"x": 5, "y": 5}, "data": "5P3/AQ=="},
        name: "Tyras Camp",
        code: "3",
      },
      {
        id: "poisonwaste",
        target: {"origin": {"x": 1987, "y": 4172, "level": 0}, "size": {"x": 5, "y": 4}},
        name: "Poison Waste",
        code: "4",
      },
      {
        id: "deathaltar",
        target: {"origin": {"x": 1858, "y": 4637, "level": 0}, "size": {"x": 2, "y": 5}},
        name: "Death Altar",
        code: "5",
      },
      {
        id: "elfcamp",
        target: {"origin": {"x": 2201, "y": 3252, "level": 0}, "size": {"x": 4, "y": 5}, "data": "7+4O"},
        name: "Elf Camp",
        code: "6",
      },
      {
        id: "mushroompatch",
        target: {"origin": {"x": 2225, "y": 3132, "level": 0}, "size": {"x": 5, "y": 5}, "data": "+P/3AA=="},
        name: "Mushroom Patch",
        code: "7",
      },
      {
        id: "harmonypillars",
        target: {"origin": {"x": 2217, "y": 3395, "level": 1}, "size": {"x": 5, "y": 5}},
        name: "Harmony Pillars",
        code: "8",
      },
    ],
    access: [{
      id: "quiver",
      type: "item",
      img: {url: "quiver.png"},
      name: {name: "Tirannwn quiver", kind: "item"},
      action_name: "Teleport",
    }]
  },
  {
    type: "teleports",
    id: "sceptreofthegods",
    name: "Sceptre of the gods",
    menu_ticks: 1,
    animation_ticks: 3,
    spots: [
      {
        id: "pyramidpain",
        target: {"origin": {"x": 1942, "y": 4498, "level": 0}},
        name: "Pyramid Plunder",
        code: "1",
      },
      {
        id: "agility",
        target: {"origin": {"x": 3341, "y": 2827, "level": 0}},
        name: "Agility Pyramid",
        code: "2",
      },
      {
        id: "ancient",
        target: {"origin": {"x": 3232, "y": 2897, "level": 0}},
        name: "Ancient Pyramid",
        code: "3",
      },
      {
        id: "palace",
        target: {"origin": {"x": 3175, "y": 2729, "level": 0}},
        name: "Golden Palace",
        code: "4",
      },
    ],
    access: [{
      id: "sotg",
      type: "item",
      name: {name: "Sceptre of the gods", kind: "item"},
      img: {url: "sotg.png"},
      action_name: "Teleport",
      menu_ticks: 1,
    }]
  },
  {
    type: "teleports",
    id: "gliders",
    name: "Gnome gliders",
    img: {url: "glider.png"},
    menu_ticks: 2,
    animation_ticks: 6,
    spots: [
      {
        id: "grandtree",
        target: {origin: {"x": 2465, "y": 3501, "level": 3}},
        name: "Ta Quir Priw",
        code: "1",
      },
      {
        id: "whitewolfmountain",
        target: {origin: {"x": 2850, "y": 3494, "level": 1}},
        name: "Sindarpos",
        code: "2",
      },
      {
        id: "digside",
        target: {origin: {"x": 3319, "y": 3438, "level": 0}},
        name: "Lemanto Andra",
        code: "3",
      },
      {
        id: "alkharid",
        target: {origin: {"x": 3284, "y": 3211, "level": 0}},
        name: "Kar-Hewo",
        code: "4",
      },
      {
        id: "karamja",
        target: {origin: {"x": 2971, "y": 2969, "level": 0}},
        name: "Gandius",
        code: "5",
      },
      {
        id: "feldiphills",
        target: {origin: {"x": 2549, "y": 2971, "level": 0}},
        name: "Lemantolly Undri",
        code: "6",
      },
      {
        id: "treegnomevillage",
        target: {origin: {"x": 2496, "y": 3191, "level": 0}},
        name: "Priw Gnomo Andralo",
        code: "7",
      },
      {
        id: "prifddinas",
        target: {origin: {x: 2208, y: 3445, level: 1}},
        name: "Dylandra",
        code: "8",
      },
      {
        id: "tualeit",
        target: {origin: {"x": 1772, "y": 11920, "level": 0}},
        name: "Kal-Undri",
        code: "9",
      },
    ],
    access: [
      {
        id: "grandtree",
        type: "entity",
        clickable_area: {origin: {"x": 2464, "y": 3502, "level": 3}},
        name: {kind: "npc", name: "Captain Errdo"},
        action_name: "Glider",
      },
      {
        id: "whitewolfmountain",
        type: "entity",
        clickable_area: {origin: {"x": 2850, "y": 3493, "level": 1}},
        name: {kind: "npc", name: "Captain Bleemadge"},
        action_name: "Glider",
      },
      {
        id: "alkharid",
        type: "entity",
        clickable_area: {origin: {"x": 3283, "y": 3212, "level": 0}},
        name: {kind: "npc", name: "Captain Dalbur"},
        action_name: "Glider",
      },
      {
        id: "karamja",
        type: "entity",
        clickable_area: {origin: {"x": 2970, "y": 2973, "level": 0}},
        name: {kind: "npc", name: "Captain Klemfoodle"},
        action_name: "Glider",
      },
      {
        id: "feldip",
        type: "entity",
        clickable_area: {origin: {"x": 2545, "y": 2972, "level": 0}}, // TODO: He is not static
        name: {kind: "npc", name: "Gnormadium Avlafrim"},
        action_name: "Glider",
      },
      {
        id: "gnomevillage",
        type: "entity",
        clickable_area: {origin: {"x": 2496, "y": 3190, "level": 0}}, // TODO: He is not static
        name: {kind: "npc", name: "Captain Belmondo"},
        action_name: "Glider",
      },
      {
        id: "prifddinas",
        type: "entity",
        clickable_area: {origin: {"x": 2207, "y": 3452, "level": 1}},
        name: {kind: "npc", name: "Captain Muggin"},
        action_name: "Glider",
      },
      {
        id: "tuaeileit",
        type: "entity",
        clickable_area: {origin: {"x": 1773, "y": 11919, "level": 0}},
        name: {kind: "npc", name: "Azalea Oakhart"},
        action_name: "Glider",
      },

    ]
  },
  {
    type: "teleports",
    id: "wickedhood",
    name: "Wicked hood",
    menu_ticks: 2,
    animation_ticks: 3,
    spots: [
      {
        id: "guild",
        target: {"origin": {"x": 3109, "y": 3156, "level": 3}},
        name: "Runecrafting Guild",
        menu_ticks: 1,
      },
      {
        id: "soul",
        target: {"origin": {"x": 2016, "y": 6878, "level": 0}},
        name: "Soul",
        code: "Soul",
      },
      {
        id: "cosmic",
        target: {"origin": {"x": 2405, "y": 4381, "level": 0}},
        name: "Cosmic",
        code: "Cosmic",
      },
      {
        id: "air",
        target: {"origin": {"x": 3128, "y": 3407, "level": 0}},
        name: "Air",
        code: "Air",
      },
      {
        id: "body",
        target: {"origin": {"x": 3050, "y": 3442, "level": 0}},
        name: "Body",
        code: "Body",
      },
      {
        id: "mind",
        target: {"origin": {"x": 2980, "y": 3511, "level": 0}},
        name: "Mind",
        code: "Mind",
      },
      {
        id: "fire",
        target: {"origin": {"x": 3310, "y": 3252, "level": 0}},
        name: "Fire",
        code: "Fire",
      },
      {
        id: "earth",
        target: {"origin": {"x": 3302, "y": 3477, "level": 0}},
        name: "Earth",
        code: "Earth",
      },
      {
        id: "water",
        target: {"origin": {"x": 3165, "y": 3183, "level": 0}},
        name: "Water",
        code: "Water",
      },
      {
        id: "nature",
        target: {"origin": {"x": 2865, "y": 3022, "level": 0}},
        name: "Nature",
        code: "Nature",
      },
      {
        id: "astral",
        target: {"origin": {"x": 2156, "y": 3866, "level": 0}},
        name: "Astral",
        code: "Astral",
      },
      {
        id: "chaos",
        target: {"origin": {"x": 2269, "y": 4844, "level": 0}},
        name: "Chaos",
        code: "Chaos",
      },
      {
        id: "law",
        target: {"origin": {"x": 2858, "y": 3378, "level": 0}},
        name: "Law",
        code: "Law",
      },
      {
        id: "blood",
        target: {"origin": {"x": 3560, "y": 9779, "level": 0}},
        name: "Blood",
        code: "Blood",
      },
      {
        id: "death",
        target: {"origin": {"x": 1863, "y": 4637, "level": 0}},
        name: "Death",
        code: "Death",
      },
    ],
    access: [{
      id: "wickedhood",
      type: "item",
      name: {name: "Wicked hood", kind: "item"},
      img: {url: "wicked.png"},
      action_name: "Teleport",
    }]
  },
  /*
{
type: "teleports",
id: "balloon",
name: "Balloon",
img: {url: "balloon.png"},
spots: [
    {
        id: "castlewars",
target: {origin: {x: 2463, y: 3109, level: 0}},
name: "Castle Wars",
        menu_ticks: 1,
        animation_ticks: 5
    },
    {
        id: "grandtree",
target: {origin: {x: 2477, y: 3462, level: 0}},
name: "Grand Tree",
        menu_ticks: 1,
        animation_ticks: 5
    },
    {
        id: "craftingguild",
target: {origin: {x: 2923, y: 3300, level: 0}},
name: "Crafting Guild",
        menu_ticks: 1,
        animation_ticks: 5
    },
    {
        id: "taverley",
target: {origin: {x: 2931, y: 3414, level: 0}},
name: "Taverley",
        menu_ticks: 1,
        animation_ticks: 5
    },
    {
        id: "varrock",
target: {origin: {x: 3298, y: 3483, level: 0}},
name: "Varrock",
        menu_ticks: 1,
        animation_ticks: 5
    },
    {
        id: "entrana",
target: {origin: {x: 2809, y: 3356, level: 0}},
name: "Entrana",
        menu_ticks: 1,
        animation_ticks: 5
    },
]
},*/
  {
    type: "teleports",
    id: "gote",
    name: "Grace of the Elves (Max Guild Portal)",
    img: {url: "gote.png"},
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "overgrownidols",
        target: {"origin": {"x": 2949, "y": 2977, "level": 0}},
        name: "Overgrown idols",
      },
      {
        id: "deepseafishing",
        target: {"origin": {"x": 2135, "y": 7107, "level": 0}},
        name: "Deep sea fishing hub",
      },
      {
        id: "lavaflowmine",
        target: {"origin": {"x": 2177, "y": 5663, "level": 0}},
        name: "Lava Flow Mine",
      },
      {
        id: "livingrockcaverns",
        target: {"origin": {"x": 3651, "y": 5122, "level": 0}},
        name: "Living Rock Caverns",
      },
      {
        id: "jadinkolair",
        target: {"origin": {"x": 3034, "y": 9231, "level": 0}},
        name: "Jadinko Lair",
      },
    ],
    access: [{
      id: "gote",
      type: "item",
      name: {name: "Grace of the elves", kind: "item"},
      action_name: "Max garden portal",
      menu_ticks: 1,
    }]
  },
  {
    type: "teleports",
    id: "spheredorgeshkaan",
    name: "Dorgesh-kaan sphere",
    img: {url: "sphere_dorgeshkaan.png"},
    menu_ticks: 1,
    animation_ticks: 11,
    spots: [
      {
        id: "north",
        target: {"origin": {"x": 2710, "y": 5349, "level": 0}, "size": {"x": 20, "y": 6}, "data": "3//2/3///////z8A/wHg"},
        name: "North",
        code: "1",
      },
      {
        id: "south",
        target: {"origin": {"x": 2721, "y": 5260, "level": 0}, "size": {"x": 4, "y": 8}, "data": "//b/bw=="},
        name: "South",
        code: "2",
      },
      {
        id: "east",
        target: {"origin": {"x": 2734, "y": 5296, "level": 1}, "size": {"x": 3, "y": 19}, "data": "////27Zt2wA="},
        name: "East",
        code: "3",
      },
      {
        id: "west",
        target: {"origin": {"x": 2692, "y": 5299, "level": 1}, "size": {"x": 10, "y": 18}, "data": "AAIIMMAAAwzg///7zz//+MMPMMAAAww="},
        name: "West",
        code: "4",
      },
    ],
    access: [{
      type: "item",
      id: "sphere",
      name: {name: "Dorgesh-kaan sphere", kind: "item"},
      action_name: "Break",
    }]
  },
  {
    type: "teleports",
    id: "spheregoblinvillage",
    name: "Goblin village sphere",
    img: {url: "sphere_goblinvillage.png"},
    menu_ticks: 0,
    animation_ticks: 11,
    spots: [{
      id: "goblinvillage",
      name: "Goblin Village",
      target: {"origin": {"x": 2953, "y": 3497, "level": 0}, "size": {"x": 8, "y": 6}, "data": "DAz/////"},
    }],
    access: [{
      type: "item",
      id: "sphere",
      name: {name: "Goblin village sphere", kind: "item"},
      action_name: "Break",
    }]
  },
  {
    type: "teleports",
    id: "naturessentinel",
    name: "Nature's sentinel outfit",
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "eternalmagicpiscatoris",
        target: {"origin": {"x": 2329, "y": 3585, "level": 0}},
        code: "1",
        name: "Eternal Magic Trees - Piscatoris",
        menu_ticks: 1,
      },
      {
        id: "eldersorcerer",
        target: {"origin": {"x": 2734, "y": 3401, "level": 0}},
        code: "2,1",
        name: "Elder Trees - East Sorcerer's Tower",
        menu_ticks: 2,
      },
      {
        id: "elderyanille",
        target: {"origin": {"x": 2572, "y": 3063, "level": 0}},
        code: "2,2",
        name: "Elder Trees - South Yanille",
        menu_ticks: 2,
      },
      {
        id: "eldergnomestronghold",
        target: {"origin": {"x": 2425, "y": 3456, "level": 0}},
        code: "2,3",
        name: "Elder Trees - Tree Gnome Stronghold",
        menu_ticks: 2,
      },
      {
        id: "elderdraynor",
        target: {"origin": {"x": 3094, "y": 3215, "level": 0}},
        code: "2,4",
        name: "Elder Trees - South Draynor",
        menu_ticks: 2,
      },
      {
        id: "elderfalador",
        target: {"origin": {"x": 3052, "y": 3320, "level": 0}},
        code: "2,5",
        name: "Elder Trees - Falador Farm",
        menu_ticks: 2,
      },
      {
        id: "eldervarrock",
        target: {"origin": {"x": 3259, "y": 3370, "level": 0}},
        code: "2,6",
        name: "Elder Trees - South Varrock",
        menu_ticks: 2,
      },
      {
        id: "elderlletya",
        target: {"origin": {"x": 2294, "y": 3147, "level": 0}},
        code: "2,7",
        name: "Elder Trees - West Lletya",
        menu_ticks: 2,
      },
      {
        id: "elderpiscatoris",
        target: {"origin": {"x": 2321, "y": 3598, "level": 0}},
        code: "2,8",
        name: "Elder Trees - Piscatoris",
        menu_ticks: 2,
      },
      {
        id: "elderedgeville",
        target: {"origin": {"x": 3094, "y": 3451, "level": 0}},
        code: "2,9,1",
        name: "Elder Trees - South Edgeville",
        menu_ticks: 3,
      },
      {
        id: "elderrimmington",
        target: {"origin": {"x": 2933, "y": 3227, "level": 0}},
        code: "2,9,2",
        name: "Elder Trees - North Rimmington",
        menu_ticks: 3,
      },
      {
        id: "elderfort",
        target: {"origin": {"x": 3375, "y": 3545, "level": 0}},
        code: "2,9,3",
        name: "Elder Trees - Fort Forinthry Grove",
        menu_ticks: 3,
      },
      {
        id: "idolsshipyard",
        target: {"origin": {"x": 2932, "y": 3026, "level": 0}},
        code: "3,1",
        name: "Overgrown Idols - West of the Karamja shipyard",
        menu_ticks: 2,
      },
      /*{
        id: "idolsjadinko",
        target: {"origin": {"x": 2949, "y": 2977, "level": 0}},
        code: "3,2",
        name: "Overgrown Idols - North of the Jadinko vine cave",
        menu_ticks: 2,
      },*/
      {
        id: "magicranging",
        target: {"origin": {"x": 2694, "y": 3425, "level": 0}},
        code: "4,1",
        name: "Magic Trees - East Ranging Guild",
        menu_ticks: 2,
      },
      {
        id: "magicsorcerer",
        target: {"origin": {"x": 2702, "y": 3397, "level": 0}},
        code: "4,2",
        name: "Magic Trees - Sorcerer's Tower",
        menu_ticks: 2,
      },
      {
        id: "magicmagetraining",
        target: {"origin": {"x": 3357, "y": 3310, "level": 0}},
        code: "4,3",
        name: "Magic Trees - Mage Training Arena",
        menu_ticks: 2,
      },
      {
        id: "magictirannwn",
        target: {"origin": {"x": 2287, "y": 3140, "level": 0}},
        code: "4,4",
        name: "Magic Trees - South Tirannwn",
        menu_ticks: 2,
      },
      {
        id: "magiccrwys",
        target: {"origin": {"x": 2249, "y": 3367, "level": 1}},
        code: "4,5",
        name: "Magic Trees - Crwys sector",
        menu_ticks: 2,
      },
      {
        id: "yewseers",
        target: {"origin": {"x": 2708, "y": 3463, "level": 0}},
        code: "5,1",
        name: "Yew Trees - Seers' Graveyard",
        menu_ticks: 2,
      },
      {
        id: "yewcathery",
        target: {"origin": {"x": 2757, "y": 3431, "level": 0}},
        code: "5,2",
        name: "Yew Trees - West Catherby",
        menu_ticks: 2,
      },
      {
        id: "yewedgeville",
        target: {"origin": {"x": 3087, "y": 3475, "level": 0}},
        code: "5,3",
        name: "Yew Trees - Edgeville",
        menu_ticks: 2,
      },
      {
        id: "yewvarrock",
        target: {"origin": {"x": 3208, "y": 3502, "level": 0}},
        code: "5,4",
        name: "Yew Trees - Varrock Palace",
        menu_ticks: 2,
      },
      /*{
        id: "yewcrwys",
        target: {"origin": {"x": 2261, "y": 3383, "level": 1}},
        code: "5,5",
        name: "Yew Trees - Crwys sector",
        menu_ticks: 2,
      },*/ // Disabled because it conflicts with the attuned crystal seed
      {
        id: "ivynorthvarrock",
        target: {"origin": {"x": 3217, "y": 3499, "level": 0}},
        code: "6,1",
        name: "Choking Ivy - North Varrock Palace",
        menu_ticks: 2,
      },
      {
        id: "ivyeastvarrock",
        target: {"origin": {"x": 3232, "y": 3460, "level": 0}},
        code: "6,2",
        name: "Choking Ivy - East Varrock Palace",
        menu_ticks: 2,
      },
      {
        id: "ivynorthfalador",
        target: {"origin": {"x": 3015, "y": 3394, "level": 0}},
        code: "6,3",
        name: "Choking Ivy - North Falador",
        menu_ticks: 2,
      },
      {
        id: "ivysouthfalador",
        target: {"origin": {"x": 3047, "y": 3326, "level": 0}},
        code: "6,4",
        name: "Choking Ivy - South Falador",
        menu_ticks: 2,
      },
      {
        id: "ivytaverley",
        target: {"origin": {"x": 2938, "y": 3428, "level": 0}},
        code: "6,5",
        name: "Choking Ivy - South-east Taverly",
        menu_ticks: 2,
      },
      {
        id: "ivyardougne",
        target: {"origin": {"x": 2623, "y": 3307, "level": 0}},
        code: "6,6",
        name: "Choking Ivy - East Ardougne Church",
        menu_ticks: 2,
      },
      {
        id: "ivyyanille",
        target: {"origin": {"x": 2594, "y": 3112, "level": 0}},
        code: "6,7",
        name: "Choking Ivy - North Yanille",
        menu_ticks: 2,
      },
      {
        id: "ivycastlewars",
        target: {"origin": {"x": 2429, "y": 3062, "level": 0}},
        code: "6,8",
        name: "Choking Ivy - South Castle Wars",
        menu_ticks: 2,
      },
      {
        id: "ivycrwys",
        target: {"origin": {"x": 2241, "y": 3375, "level": 1}},
        code: "6,9",
        name: "Choking Ivy - Crwys sector",
        menu_ticks: 2,
      },
      {
        id: "arcticpine",
        target: {"origin": {"x": 2355, "y": 3848, "level": 0}},
        code: "7",
        name: "Arctic Pine Trees",
        menu_ticks: 1,
      },
      // 0,1,1 magogany tai bwo wannai omitted due to same spot as teak
      {
        id: "mahoganyape",
        target: {"origin": {"x": 2716, "y": 2708, "level": 0}},
        code: "0,1,2",
        name: "Mahogany Trees - Ape Atoll",
        menu_ticks: 3,
      },
      {
        id: "mahoganiharazi",
        target: {"origin": {"x": 2932, "y": 2928, "level": 0}},
        code: "0,1,3",
        name: "Mahogany Trees - Kharazi Jungle",
        menu_ticks: 3,
      },
      {
        id: "acadiaoasis",
        target: {"origin": {"x": 3307, "y": 3245, "level": 0}},
        code: "0,2,1",
        name: "Acadia Trees - Het's Oasis",
        menu_ticks: 3,
      },
      {
        id: "acadia",
        target: {"origin": {"x": 3186, "y": 2720, "level": 0}},
        code: "0,2,2",
        name: "Acadia Trees - Menaphos",
        menu_ticks: 3,
      },
      {
        id: "maplesouthvarrock",
        target: {"origin": {"x": 3250, "y": 3365, "level": 0}},
        code: "0,3,1",
        name: "Maple Trees - South Varrock'",
        menu_ticks: 3,
      },
      {
        id: "mapleseers",
        target: {"origin": {"x": 2728, "y": 3501, "level": 0}},
        code: "0,3,2",
        name: "Maple Trees - Seers'",
        menu_ticks: 3,
      },
      {
        id: "mapledaemonheim",
        target: {"origin": {"x": 3500, "y": 3626, "level": 0}},
        code: "0,3,3",
        name: "Maple Trees - Daemonheim Peninsula Resource Dungeon'",
        menu_ticks: 3,
      },
      {
        id: "teakmusa",
        target: {"origin": {"x": 2896, "y": 3152, "level": 0}},
        code: "0,4,1",
        name: "Teak Trees - Musa Point",
        menu_ticks: 3,
      },
      {
        id: "teaktai",
        target: {"origin": {"x": 2815, "y": 3084, "level": 0}},
        code: "0,4,2",
        name: "Teak Trees - Tai Bwo Wannai",
        menu_ticks: 3,
      },
      {
        id: "teakape",
        target: {"origin": {"x": 2774, "y": 2696, "level": 0}},
        code: "0,4,3",
        name: "Teak Trees - Ape Atoll",
        menu_ticks: 3,
      },
      {
        id: "teakcastlewars",
        target: {"origin": {"x": 2334, "y": 3048, "level": 0}},
        code: "0,4,4",
        name: "Teak Trees - South-west Castle Wars",
        menu_ticks: 3,
      },
      {
        id: "willowdraynor",
        target: {"origin": {"x": 3090, "y": 3232, "level": 0}},
        code: "0,5,1",
        name: "Willow Trees - Draynor",
        menu_ticks: 3,
      },
      {
        id: "willowcathery",
        target: {"origin": {"x": 2783, "y": 3429, "level": 0}},
        code: "0,5,2",
        name: "Willow Trees - Catherby",
        menu_ticks: 3,
      },
      {
        id: "willowbarbarianoutpost",
        target: {"origin": {"x": 2520, "y": 3579, "level": 0}},
        code: "0,5,3",
        name: "Willow Trees - Barbarian Outpost",
        menu_ticks: 3,
      },
      {
        id: "oakwestvarrock",
        target: {"origin": {"x": 3166, "y": 3415, "level": 0}},
        code: "0,6,1",
        name: "Oak Trees - West Varrock",
        menu_ticks: 3,
      },
      {
        id: "oakeastvarrock",
        target: {"origin": {"x": 3277, "y": 3475, "level": 0}},
        code: "0,6,2",
        name: "Oak Trees - East Varrock",
        menu_ticks: 3,
      },
      {
        id: "normalwestvarrock",
        target: {"origin": {"x": 3135, "y": 3430, "level": 0}},
        code: "0,7,1",
        name: "Normal Trees - West Varrock",
        menu_ticks: 3,
      },
      {
        id: "normaleastvarrock",
        target: {"origin": {"x": 3290, "y": 3475, "level": 0}},
        code: "0,7,2",
        name: "Normal Trees - East Varrock",
        menu_ticks: 3,
      },
    ],
    access: [{
      id: "outfit",
      type: "item",
      name: {name: "Nature's sentinel helm", kind: "item"},
      action_name: "Teleport",
      img: {url: "sentinel.png"},
    }]
  },

  {
    type: "teleports",
    id: "volcanictrapper",
    name: "Volcanic trapper outfit",
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "nettingcharming",
        target: {"origin": {"x": 3367, "y": 3742, "level": 0}},
        code: "2,5",
        name: "Butterfly Netting - Charming Moth",
        menu_ticks: 2,
      },
    ],
    access: [{
      id: "outfit",
      type: "item",
      name: {name: "Volcanic trapper head", kind: "item"},
      action_name: "Teleport",
      img: {url: "Volcanic_trapper_head.webp"},
    }]
  },

  {
    type: "teleports",
    id: "archteleport",
    name: "Archaeology teleport (or outfit)",
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "campus",
        target: {"origin": {"x": 3336, "y": 3378, "level": 0}},
        code: "1",
        name: "Archaeology Campus",
      },
      {
        id: "kharidet",
        target: {"origin": {"x": 3345, "y": 3194, "level": 0}},
        code: "2",
        name: "Kharid-et",
      },
      {
        id: "infernal",
        target: {"origin": {"x": 3271, "y": 3504, "level": 0}},
        code: "3",
        name: "Infernal Source",
      },
      {
        id: "everlight",
        target: {"origin": {"x": 3697, "y": 3206, "level": 0}},
        code: "4",
        name: "Everlight",
      },
      {
        id: "senntisten",
        target: {"origin": {"x": 1784, "y": 1296, "level": 0}},
        code: "5",
        name: "Senntisten",
      },
      {
        id: "stormguard",
        target: {"origin": {"x": 2680, "y": 3403, "level": 0}},
        code: "6",
        name: "Stormguard Citadel",
      },
      {
        id: "daemonheim",
        target: {"origin": {"x": 3428, "y": 3699, "level": 0}},
        code: "7",
        name: "Daemonheim",
      },
      {
        id: "warforge",
        target: {"origin": {"x": 2409, "y": 2824, "level": 0}},
        code: "8",
        name: "Warforge",
      },
      {
        id: "orthen",
        target: {"origin": {"x": 5457, "y": 2339, "level": 0}},
        code: "9",
        name: "Orthen",
      },
      {
        id: "jacques",
        target: {"origin": {"x": 3254, "y": 3453, "level": 2}},
        code: "0,1",
        name: "Collectors - Art Critic Jacques",
        menu_ticks: 2,
      },
      {
        id: "tess",
        target: {"origin": {"x": 2550, "y": 2853, "level": 0}},
        code: "0,2",
        name: "Collectors - Chief Tess",
        menu_ticks: 2,
      },
      {
        id: "generals",
        target: {"origin": {"x": 2957, "y": 3510, "level": 0}},
        code: "0,3",
        name: "Collectors - Generals Bentnoze & Wartface",
        menu_ticks: 2,
      },
      {
        id: "isaura",
        target: {"origin": {"x": 2921, "y": 9701, "level": 0}},
        code: "0,4",
        name: "Collectors - Isaura",
        menu_ticks: 2,
      },
      {
        id: "lowse",
        target: {"origin": {"x": 2985, "y": 3268, "level": 0}},
        code: "0,5",
        name: "Collectors - Lowse",
        menu_ticks: 2,
      },
      {
        id: "sharrigan",
        target: {"origin": {"x": 5456, "y": 2344, "level": 0}},
        code: "0,6",
        name: "Collectors - Sharrigan",
        menu_ticks: 2,
      },
      {
        id: "atcha",
        target: {"origin": {"x": 2963, "y": 3346, "level": 0}},
        code: "0,7",
        name: "Collectors - Sir Atcha",
        menu_ticks: 2,
      },
      {
        id: "soran",
        target: {"origin": {"x": 3181, "y": 3417, "level": 0}},
        code: "0,8",
        name: "Collectors - Soran",
        menu_ticks: 2,
      },
      {
        id: "velucia",
        target: {"origin": {"x": 3342, "y": 3382, "level": 0}},
        code: "0,9",
        name: "Collectors - Velucia",
        menu_ticks: 2,
      },
      {
        id: "wiseoldman",
        target: {"origin": {"x": 3088, "y": 3254, "level": 0}},
        code: "0,0,1",
        name: "Collectors - Wise Old Man",
        menu_ticks: 3,
      },
    ],
    access: [{
      id: "scrolls",
      type: "item",
      img: {url: "archteleport.png"},
      name: {name: "Archaeology teleport", kind: "item"},
      action_name: "Teleport"
    }] // TODO: Outfit
  },
  {
    type: "teleports",
    id: "ringofkinship",
    name: "Ring of Kinship",
    spots: [{
      id: "daemonheim",
      name: "Daemonheim",
      target: {"origin": {"x": 3441, "y": 3694, "level": 0}, "size": {"x": 11, "y": 11}, "data": "9/////mPf/jDH/6ABzjAAQ=="},
      menu_ticks: 0,
      animation_ticks: 8
    }],
    access: [{
      id: "ring",
      type: "item",
      img: {url: "ringofkinship.png"},
      name: {name: "Ring of kinship", kind: "item"},
      action_name: "Teleport to Daemonheim"
    }]
  },
  {
    type: "teleports",
    id: "witchdoctormask",
    name: "Witchdoctor mask",
    img: {url: "witchdoctormask.png"},
    spots: [{
      id: "herblorehabitat",
      target: {"origin": {"x": 2953, "y": 2933, "level": 0}},
      name: "Herblore Habitat",
      menu_ticks: 1,
      animation_ticks: 5
    }],
    access: [
      {id: "mask", type: "item", name: {name: "Witchdoctor mask", kind: "item"}, action_name: "Teleport"}
    ]
  },
  {
    type: "teleports",
    id: "ecctophial",
    name: "Ectophial",
    spots: [{
      id: "ectofunctus",
      name: "Ectofunctus",
      target: {"origin": {"x": 3657, "y": 3522, "level": 0}, "size": {"x": 5, "y": 3}, "data": "/zc="},
      menu_ticks: 0,
      animation_ticks: 13
    }],
    access: [{
      id: "phial",
      type: "item",
      img: {url: "ectophial.png"},
      name: {name: "Ectophial", kind: "item"},
      action_name: "Empty"
    }]
  },
  {
    type: "teleports",
    id: "explorersring",
    name: "Explorer's ring",
    img: {url: "explorersring.png"},
    menu_ticks: 0,
    animation_ticks: 10,
    spots: [{
      id: "cabbagefield",
      target: {"origin": {"x": 3053, "y": 3291, "level": 0}},
      name: "Cabbage field",
    }],
    access: [{
      type: "item",
      id: "ring",
      name: {name: "Explorer's ring 4", kind: "item"},
      action_name: "Cabbage-port",
    }]
  },
  {
    type: "teleports",
    id: "karamjagloves",
    name: "Karamja gloves",
    img: {url: "karamjagloves.png"},
    spots: [{
      id: "gemmine",
      name: "Gem Mine",
      target: {"origin": {"x": 2838, "y": 9385, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/3/vAQ=="},
      menu_ticks: 1,
      animation_ticks: 5
    }],
    access: [{
      id: "gloves",
      type: "item",
      name: {name: "Karamja gloves 4", kind: "item"},
      action_name: "Teleport"
    }]
  },
  {
    type: "teleports",
    id: "theheart",
    name: "The Heart teleport",
    img: {url: "The_Heart_teleport.webp"},
    spots: [{
      id: "center",
      name: "The Heart",
      target: {"origin": {"x": 3197, "y": 6941, "level": 1}, "size": {"x": 5, "y": 5}},
      menu_ticks: 0,
      animation_ticks: 4
    }],
    access: [
      {type: "item", id: "tablet", name: {name: "The Heart teleport", kind: "item"}, action_name: "Break"}
    ]
  },
  {
    type: "teleports",
    id: "fremmenikboots",
    name: "Fremmenik sea boots",
    img: {url: "fremmenikboots.gif"},
    spots: [{
      id: "relekkamarket",
      target: {"origin": {"x": 2651, "y": 3689, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///vAQ=="},
      name: "Rellekka Market",
      icon_position_override: {"x": 2651, "y": 3691, "level": 0},
      menu_ticks: 0,
      animation_ticks: default_teleport_ticks
    }], access: [
      {type: "item", id: "seaboots", name: {kind: "item", name: "Fremennik sea boots 4"}, action_name: "Rellekka teleport"},
    ]
  },
  {
    type: "teleports",
    id: "legendscape",
    name: "Legends Cape",
    img: {url: "legendscape.png"},
    spots: [{
      id: "legendsguild",
      target: {origin: {x: 2728, y: 3348, level: 0}},
      name: "Legend's Guild",
      animation_ticks: default_teleport_ticks
    }],
    access: [{
      id: "cape",
      type: "item",
      action_name: "Teleport",
      name: {kind: "item", name: "Cape of legends"},
      menu_ticks: 1,
    }]
  }
  ,/*
    {
        type: "teleports",
        id: "archjounal",
        name: "Archaeology journal",
        img: {url: "archjournal.png"},
        spots: [{
            id: "guild",
            name: "Archaology Guild",
            target: {origin: {x: 3334, y: 3379, level: 0}},
            menu_ticks: 1,
            animation_ticks: default_teleport_ticks
        }]
    },*/
  {
    type: "teleports",
    id: "skullsceptre",
    name: "Skull Sceptre",
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "outside",
        target: {"origin": {"x": 3081, "y": 3421, "level": 0}},
        code: "1",
        name: "Outside",
      },
      {
        id: "war",
        target: {"origin": {"x": 1859, "y": 5240, "level": 0}, "size": {"x": 5, "y": 5}, "data": "+f/vAQ=="},
        code: "2",
        name: "Vault of War",
      },
      {
        id: "famine",
        target: {"origin": {"x": 2041, "y": 5241, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//+vAA=="},
        code: "3",
        name: "Catacomb of Famine",
      },
      {
        id: "pestillence",
        target: {"origin": {"x": 2121, "y": 5251, "level": 0}, "size": {"x": 5, "y": 5}, "data": "8v//AQ=="},
        code: "4",
        name: "Pit of Pestilence",
      },
      {
        id: "death",
        target: {"origin": {"x": 2358, "y": 5211, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/v//AQ=="},
        code: "5",
        name: "Sepulchre of Death",
      },
    ],
    access: [
      {
        type: "item",
        img: {url: "skullsceptre.png"},
        name: {kind: "item", name: "Skull sceptre"},
        action_name: "Teleport",
        id: "tablet"
      }
    ]
  }
  ,
  {
    type: "teleports",
    id: "dragonkinlaboratory",
    name: "Dragonkin Laboratory teleport",
    menu_ticks: 1,
    animation_ticks: default_teleport_ticks
      + 1,
    spots: [{
      id: "spot",
      target: {"origin": {"x": 3367, "y": 3887, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/39CAA=="},
      name: "Dragonkin Laboratory",
    }],
    access: [
      {
        type: "item",
        img: {url: "dragonkin.png"},
        name: {kind: "item", name: "Dragonkin Laboratory teleport"},
        action_name: "Break",
        id: "tablet"
      }
    ]
  }
  ,
  {
    type: "teleports",
    id: "wildernessobelisk",
    name: "Portable obelisk",
    menu_ticks: 1,
    animation_ticks: 3,
    spots: [
      {
        id: "13",
        target: {"origin": {"x": 3155, "y": 3619, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "1",
        name: "Level 13",
      },
      {
        id: "18",
        target: {"origin": {"x": 3218, "y": 3655, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "2",
        name: "Level 18",
      },
      {
        id: "27",
        target: {"origin": {"x": 3034, "y": 3731, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "3",
        name: "Level 27",
      },
      {
        id: "35",
        target: {"origin": {"x": 3105, "y": 3793, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "4",
        name: "Level 35",
      },
      {
        id: "44",
        target: {"origin": {"x": 2979, "y": 3865, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "5",
        name: "Level 44",
      },
      {
        id: "50",
        target: {"origin": {"x": 3306, "y": 3915, "level": 0}, "size": {"x": 3, "y": 3}},
        code: "6",
        name: "Level 50",
      },
    ],
    access: [
      {
        id: "obelisk",
        type: "item",
        name: {name: "Portable obelisk", kind: "item"},
        img: {url: "portableobelisk.png"},
        action_name: "Teleport",
      }
    ]
  },
  {
    type: "teleports",
    id: "wildernesssword",
    name: "Wilderness sword",
    img: {url: "wildernesssword.png"},
    spots: [
      {
        id: "edgeville",
        target: {"origin": {"x": 3083, "y": 3499, "level": 0}, "size": {"x": 7, "y": 7}, "data": "fD7/////AA=="},
        code: "1,1",
        name: "Edgeville",
        menu_ticks: 3,
        animation_ticks: 5
      },
      {
        id: "herbpatch",
        target: {"origin": {"x": 3140, "y": 3822, "level": 0}, "size": {"x": 7, "y": 7}, "data": "8fn/////AQ=="},
        code: "1,2",
        name: "Herb patch",
        menu_ticks: 3,
        animation_ticks: 5
      },
      {
        id: "forinthry",
        target: {"origin": {"x": 3078, "y": 10056, "level": 0}, "size": {"x": 6, "y": 6}, "data": "/P//PQ4="},
        code: "1,3",
        name: "Forinthry Dungeon",
        menu_ticks: 3,
        animation_ticks: 5
      },
      {
        id: "agility",
        target: {"origin": {"x": 2995, "y": 3910, "level": 0}, "size": {"x": 7, "y": 6}, "data": "//////MA"},
        code: "1,5",
        name: "Wilderness Agility course",
        menu_ticks: 3,
        animation_ticks: 5
      },
    ],
    access: [{
      type: "item",
      id: "sword",
      name: {name: "Wilderness Sword 4", kind: "item"},
      action_name: "Operate",
    }]
  },
  {
    type: "teleports",
    id: "lyre",
    name: "Enchanted lyre",
    menu_ticks: 1,
    animation_ticks: 6,
    spots: [
      {
        id: "relekka",
        target: {"origin": {"x": 2651, "y": 3689, "level": 0}, "size": {"x": 5, "y": 5}, "data": "///vAQ=="},
        icon_position_override: {"x": 2655, "y": 3691, "level": 0},
        code: "1",
        name: "Rellekka",
        menu_ticks: 1,
        animation_ticks: 6
      },
      {
        id: "waterbirth",
        target: {"origin": {"x": 2525, "y": 3738, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/H/OAQ=="},
        code: "2",
        name: "Waterbirth Island",
      },
      {
        id: "neitiznot",
        target: {"origin": {"x": 2310, "y": 3784, "level": 0}, "size": {"x": 3, "y": 5}, "data": "22Y="},
        code: "3",
        name: "Neitiznot",
      },
      {
        id: "jatizso",
        target: {"origin": {"x": 2402, "y": 3780, "level": 0}, "size": {"x": 5, "y": 5}, "data": "6//3AA=="},
        code: "4",
        name: "Jatizso",
      },
      {
        id: "miscellania",
        target: {"origin": {"x": 2515, "y": 3858, "level": 0}, "size": {"x": 5, "y": 5}, "data": "//8/AQ=="},
        code: "5",
        name: "Miscellania",
      },
      {
        id: "etceteria",
        target: {"origin": {"x": 2591, "y": 3878, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "6",
        name: "Etceteria",
      },
      {
        id: "relekkamarket",
        target: {"origin": {"x": 2641, "y": 3675, "level": 0}, "size": {"x": 5, "y": 5}},
        code: "7",
        name: "Rellekka Market",
      },
    ],
    access: [{
      id: "lyre",
      type: "item",
      name: {name: "Enchanted lyre", kind: "item"},
      img: {url: "enchantedlyre.png"},
      action_name: "Play",
    }]
  },
  {
    type: "teleports",
    id: "charterships",
    name: "Charter Ships",
    img: {url: "sail.png"},
    menu_ticks: 1,
    animation_ticks: 5,
    spots: [
      {
        id: "tyras",
        target: {origin: {x: 2142, y: 3122, level: 0}},
        name: "Port Tyras",
      },
      {
        id: "brimhaven",
        target: {origin: {x: 2760, y: 3238, level: 0}},
        name: "Brimhaven",
      },
      {
        id: "catherby",
        target: {origin: {x: 2796, y: 3406, level: 0}},
        name: "Catherby",
      },
      {
        id: "khazard",
        target: {origin: {x: 2674, y: 3144, level: 0}},
        name: "Port Khazard",
      },
      {
        id: "ooglog",
        target: {origin: {x: 2623, y: 2857, level: 0}},
        name: "Oo'glog",
      },
      {
        id: "karamja",
        target: {origin: {x: 2954, y: 3158, level: 0}},
        name: "Karamja",
      },
      {
        id: "shipyard",
        target: {origin: {x: 3001, y: 3032, level: 0}},
        name: "Shipyard",
      },
      {
        id: "sarim",
        target: {origin: {x: 3043, y: 3191, level: 0}},
        name: "Port Sarim",
      },
      {
        id: "phasmatys",
        target: {origin: {x: 3702, y: 3503, level: 0}},
        name: "Port Phasmatys",
      },
      {
        id: "mosleharmless",
        target: {origin: {x: 3671, y: 2931, level: 0}},
        name: "Mos Le'Harmless",
      },
      {
        id: "menaphos",
        target: {origin: {x: 3140, y: 2662, level: 0}},
        name: "Menaphos",
      },
    ],
    access: [
      {
        type: "entity",
        id: "sarim",
        name: {kind: "npc", name: "Trader Crewmember (Port Sarim)"},
        clickable_area: {"origin": {"x": 3035, "y": 3190, "level": 0}, "size": {"x": 15, "y": 3}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "catherbvy",
        name: {kind: "npc", name: "Trader Crewmember (Catherby)"},
        clickable_area: {"origin": {"x": 2792, "y": 3405, "level": 0}, "size": {"x": 4, "y": 7}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "tyras",
        name: {kind: "npc", name: "Trader Crewmember (Port Tyras)"},
        clickable_area: {"origin": {"x": 2141, "y": 3121, "level": 0}, "size": {"x": 8, "y": 3}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "brimhaven",
        name: {kind: "npc", name: "Trader Crewmember (Brimhaven)"},
        clickable_area: {"origin": {"x": 2759, "y": 3237, "level": 0}, "size": {"x": 2, "y": 3}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "khazard",
        name: {kind: "npc", name: "Trader Crewmember (Port Khazard)"},
        clickable_area: {"origin": {"x": 2673, "y": 3144, "level": 0}, "size": {"x": 3, "y": 5}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "ooglog",
        name: {kind: "npc", name: "Trader Crewmember (Oo'glog)"},
        clickable_area: {"origin": {"x": 2619, "y": 2856, "level": 0}, "size": {"x": 5, "y": 2}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "musa",
        name: {kind: "npc", name: "Trader Crewmember (Musa Point)"},
        clickable_area: {"origin": {"x": 2953, "y": 3153, "level": 0}, "size": {"x": 3, "y": 11}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "shipyard",
        name: {kind: "npc", name: "Trader Crewmember (Shipyard)"},
        clickable_area: {"origin": {"x": 3000, "y": 3028, "level": 0}, "size": {"x": 3, "y": 11}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "phasmatys",
        name: {kind: "npc", name: "Trader Crewmember (Port Phasmatys)"},
        clickable_area: {"origin": {"x": 3701, "y": 3499, "level": 0}, "size": {"x": 2, "y": 7}},
        action_name: "Charter"
      },
      {
        type: "entity",
        id: "menaphos",
        name: {kind: "npc", name: "Trader Crewmember (Menaphos)"},
        clickable_area: {"origin": {"x": 3139, "y": 2661, "level": 0}, "size": {"x": 11, "y": 2}},
        action_name: "Charter"
      },
    ]
  },
  {
    type: "teleports",
    id: "dragontrinkets",
    name: "Dragon Trinkets",
    animation_ticks: 3,
    menu_ticks: 2,
    spots: [
      {
        id: "green",
        target: {"origin": {"x": 3303, "y": 5468, "level": 0}},
        name: "Green Dragons - Chaos Tunnels",
        code: "1",
      },
      {
        id: "brutalgreen",
        target: {"origin": {"x": 2512, "y": 3511, "level": 0}},
        name: "Brutal Green Dragons - Baxtorian Falls",
        code: "2",
      },
      {
        id: "blue",
        target: {"origin": {"x": 2891, "y": 9769, "level": 0}},
        name: "Blue Dragons - Taverley Dungeon",
        code: "3",
      },
      {
        id: "red",
        target: {"origin": {"x": 2731, "y": 9529, "level": 0}},
        name: "Red Dragons - Brimhaven Dungeon",
        code: "4",
      },
      {
        id: "black",
        target: {"origin": {"x": 1565, "y": 4356, "level": 0}},
        name: "Black Dragons . Evil Chicken´s Lair",
        code: "5",
      },
      {
        id: "kbd",
        target: {"origin": {"x": 3051, "y": 3519, "level": 0}},
        name: "King Black Dragon - Edgeville",
        code: "6",
      },
      {
        id: "qbd",
        target: {"origin": {"x": 1198, "y": 6499, "level": 0}},
        name: "Queen Black Dragon - Grotworm Lair",
        code: "7",
      },
    ],
    access: [{
      id: "trinkets",
      type: "item",
      name: {name: "Dragon trinkets", kind: "item"},
      img: {url: "dragontrinkets.png"},
      action_name: "Teleport",
    }]
  },
  {
    type: "teleports",
    id: "metallicdragontrinkets",
    name: "Metallic Dragon Trinkets",
    animation_ticks: 3,
    menu_ticks: 2,
    spots: [
      {
        id: "bronze",
        target: {"origin": {"x": 2723, "y": 9486, "level": 0}},
        name: "Bronze Dragons - Brimhaven Dungeon",
        code: "1",
      },
      {
        id: "iron",
        target: {"origin": {"x": 2694, "y": 9443, "level": 0}},
        name: "Iron Dragons - Brimhaven Dungeon",
        code: "2",
      },
      {
        id: "steel",
        target: {"origin": {"x": 2708, "y": 9468, "level": 0}},
        name: "Steel Dragons - Brimhaven Dungeon",
        code: "3",
      },
      {
        id: "mithril",
        target: {"origin": {"x": 1778, "y": 5346, "level": 0}},
        name: "Mithril Dragons - Ancient Cavern",
        code: "4",
      },
      {
        id: "adamant",
        target: {"origin": {"x": 4516, "y": 6046, "level": 0}},
        name: "Adamant Dragons - Brimhaven Adamant Dungeon",
        code: "5",
      },
      {
        id: "rune",
        target: {"origin": {"x": 2367, "y": 3358, "level": 0}},
        name: "Rune Dragons - World Gate",
        code: "6",
      },
    ],
    access: [{
      id: "trinkets",
      type: "item",
      name: {name: "Metallic dragon trinkets", kind: "item"},
      img: {url: "metallicdragontrinkets.png"},
      action_name: "Teleport",
    }]
  },
  {
    type: "teleports",
    id: "amuletofnature",
    name: "Amulet of Nature",
    menu_ticks: 0,
    animation_ticks: 3,
    spots: [
      {
        id: "draynornightshade",
        target: {"origin": {"x": 3084, "y": 3353, "level": 0}, "size": {"x": 4, "y": 4}, "data": "j+g="},
        name: "Nightshade Patch",
      },
      {
        id: "herblorehabitat",
        target: {"origin": {"x": 2946, "y": 2904, "level": 0}, "size": {"x": 4, "y": 4}, "data": "nPk="},
        name: "Vine Bush Patch",
      },
      {
        id: "faladortree",
        target: {"origin": {"x": 3002, "y": 3371, "level": 0}, "size": {"x": 5, "y": 5}, "data": "P8b4AQ=="},
        name: "Falador Tree Patch",
      },
      {
        id: "harmonyallotment",
        target: {"origin": {"x": 3795, "y": 2833, "level": 0}, "size": {"x": 1, "y": 6}},
        name: "Harmony Island Allotment Patch",
      },
      {
        id: "grandtreetreepatch",
        target: {"origin": {"x": 2434, "y": 3413, "level": 0}, "size": {"x": 5, "y": 5}, "data": "LsboAA=="},
        name: "Tree Gnome Stronghold Tree Patch",
      },
      {
        id: "gnomemazefruittree",
        target: {"origin": {"x": 2488, "y": 3178, "level": 0}, "size": {"x": 4, "y": 4}, "data": "lmk="},
        name: "Tree Gnome Village Fruit Tree Patch",
      },
      {
        id: "mcgruborswoodhops",
        target: {"origin": {"x": 2663, "y": 3522, "level": 0}, "size": {"x": 8, "y": 8}, "data": "foGBgYGBgX4="},
        name: "Hops Patch north of McGrubor's Wood",
      },
    ],
    access: [{
      id: "cape",
      type: "item",
      action_name: "Teleport",
      img: {url: "amuletofnature.png"},
      name: {kind: "item", name: "Amulet of nature"},
    }]
  },
  {
    type: "teleports",
    id: "tokkulzo",
    name: "TokKul-Zo",
    img: {url: "tokkulzo.png"},
    menu_ticks: 2,
    animation_ticks: 5,
    spots: [
      {
        id: "plaza",
        target: {"origin": {"x": 4669, "y": 5150, "level": 0}, "size": {"x": 8, "y": 8}},
        name: "Main Plaza",
        code: "1",
      },
      {
        id: "pit",
        target: {"origin": {"x": 4596, "y": 5059, "level": 0}, "size": {"x": 8, "y": 7}, "data": "fv/+////7g=="},
        name: "Fight Pit",
        code: "2",
      },
      {
        id: "cave",
        target: {"origin": {"x": 4607, "y": 5125, "level": 0}, "size": {"x": 6, "y": 8}, "data": "OM7////z"},
        name: "Fight Cave",
        code: "3",
      },
      {
        id: "kiln",
        target: {"origin": {"x": 4741, "y": 5167, "level": 0}, "size": {"x": 6, "y": 8}, "data": "nvf9/+97"},
        name: "Fight Kiln",
        code: "4",
      },
      {
        id: "cauldron",
        target: {"origin": {"x": 4783, "y": 5125, "level": 0}, "size": {"x": 8, "y": 6}, "data": "////fn5+"},
        name: "Fight Cauldron",
        code: "5",
      },
    ],
    access: [
      {id: "ring", type: "item", name: {kind: "item", name: "TokKul-Zo"}, action_name: "Teleport"}
    ]
  },
  {
    type: "teleports",
    id: "grandseedpod",
    name: "Grand seed pod",
    menu_ticks: 1,
    animation_ticks: 4,
    spots: [{
      id: "grandtree",
      target: {"origin": {"x": 2465, "y": 3495, "level": 0}},
      name: "Grand Tree",
    }],
    access: [{
      type: "item",
      id: "pod",
      name: {name: "Grand seed pod", kind: "item"},
      img: {url: "Grand_seed_pod.png"},
      action_name: "Squash"
    }]
  },
  {
    type: "teleports",
    id: "sandseed",
    name: "Mystical sand seed",
    menu_ticks: 1,
    animation_ticks: 7,
    spots: [{
      id: "garden",
      target: {"origin": {"x": 3320, "y": 3307, "level": 0}},
      name: "Garden of Kharid",
    }],
    access: [{
      type: "item",
      id: "seed",
      name: {name: "Mystical sand seed", kind: "item"},
      img: {url: "Mystical_sand_seed.png"},
      action_name: "Plant"
    }]
  },
  {
    type: "teleports",
    id: "passingbracelet",
    name: "Passing bracelet",
    menu_ticks: 1,
    animation_ticks: 4,
    spots: [
      {
        id: "gardens",
        target: {"origin": {"x": 1169, "y": 1787, "level": 1}},
        name: "City of Um: Hanging Gardens",
        code: "1",
        facing: direction.south
      }, {
        id: "haunt",
        target: {"origin": {"x": 1164, "y": 1838, "level": 1}},
        name: "City of Um: Haunt on the Hill",
        code: "2",
        facing: direction.north
      }, {
        id: "reflection",
        target: {"origin": {"x": 1134, "y": 1723, "level": 1}},
        name: "City of Um: Reflection Pool",
        code: "3",
        facing: direction.north
      },
    ],
    access: [{
      type: "item",
      id: "bracelet",
      name: {name: "Passing bracelet", kind: "item"},
      img: {url: "Passing_bracelet.png"},
      action_name: "Rub"
    }]
  },
  {
    type: "teleports",
    id: "tomeofum",
    name: "Tome of Um",
    menu_ticks: 1,
    animation_ticks: 4,
    spots: [
      {
        id: "smithy",
        target: {"origin": {"x": 1145, "y": 1805, "level": 1}, "size": {"x": 5, "y": 5}, "data": "//v/AA=="},
        name: "Um Smithy",
        code: "1,1",
      }, {
        id: "ritualsite",
        target: {"origin": {"x": 1038, "y": 1760, "level": 1}},
        name: "Um Ritual Site",
        code: "1,2",
      }
    ],
    access: [{
      type: "item",
      id: "tome",
      name: {name: "Tome of Um", kind: "item"},
      img: {url: "Tome_of_Um_2.webp"},
      action_name: "Operate"
    }]
  },
  {
    type: "teleports",
    id: "camulet",
    name: "Camulet",
    menu_ticks: 1,
    animation_ticks: 3,
    spots: [
      {
        id: "temple",
        target: {"origin": {"x": 3194, "y": 2926, "level": 0}},
        name: "Enakhra's Temple",
      },
    ],
    access: [
      {
        id: "amulet",
        type: "item",
        name: {name: "Camulet", kind: "item"},
        img: {url: "Camulet.png"},
        action_name: "Rub",
      }
    ]
  },
  {
    type: "teleports",
    id: "diskofreturning",
    name: "Disk of returning",
    menu_ticks: 1,
    spots: [
      /*{
        id: "bts",
        target: {"origin": {"x": 1183, "y": 5396, "level": 1}},
        name: "Behind the scenes",
        code: "2",
        animation_ticks: 7,
      },*/
      {
        id: "return",
        target: {"origin": {"x": 2982, "y": 9804, "level": 0}},
        name: "Return",
        animation_ticks: 1,
      },
      {
        id: "lifealtar",
        target: {"origin": {"x": 1065, "y": 5544, "level": 0}},
        name: "Life Altar",
        code: "3",
        animation_ticks: 4,
      },
    ],
    access: [
      {
        id: "disk",
        type: "item",
        name: {name: "Disk of returning", kind: "item"},
        img: {url: "Disk_of_returning_(Gower_Quest).png"},
        action_name: "Scan",
      }
    ]
  },
  {
    type: "teleports",
    id: "magicwhistle",
    name: "Magic whistle",
    menu_ticks: 1,
    spots: [
      {
        id: "return",
        target: {"origin": {"x": 2741, "y": 3235, "level": 0}},
        name: "Return",
        animation_ticks: 2,
      },
    ],
    access: [
      {
        id: "whistle",
        type: "item",
        name: {name: "Magic whistle", kind: "item"},
        img: {url: "Magic_whistle.webp"},
        action_name: "Blow",
        area_restriction: {"origin": {"x": 2624, "y": 4672, "level": 0}, size: {x: 64, y: 64}}
      }
    ]
  }, {
    type: "teleports",
    id: "warsbossportal",
    name: "Boss portal",
    menu_ticks: 0,
    animation_ticks: 3,
    spots: [
      {id: "gregorovic", name: "Gregorovic", img: {url: "Gregorovic_(boss_portal)_texture.webp", width: 40}, target: {"origin": {"x": 3277, "y": 7053, "level": 1}}},
      {id: "helwyr", name: "Helwyr", img: {url: "Helwyr_(boss_portal)_texture.webp", width: 40}, target: {"origin": {"x": 3270, "y": 6905, "level": 1}}},
      {id: "twinfuries", name: "The Twin Furies", img: {url: "Twin_Furies_(boss_portal)_texture.png", width: 40}, target: {"origin": {"x": 3128, "y": 7047, "level": 1}}},
      {id: "vindicta", name: "Vindicta & Gorvek", img: {url: "Vindicta_and_Gorvek_(boss_portal)_texture.png", width: 40,}, target: {"origin": {"x": 3119, "y": 6903, "level": 1}}},

      {
        id: "ed1",
        name: "Temple of Aminishi",
        img: {url: "Seiryu_the_Azure_Serpent_(boss_portal)_texture.png", width: 40,},
        target: {"origin": {"x": 2094, "y": 11352, "level": 0}}
      },
      //{id: "ed2", name: "Dragonkin Laboratory", img: {url: "Black_stone_dragon_(boss_portal)_texture.png", width: 40,}, target: {"origin": {"x": 3119, "y": 6903, "level": 1}}},
      {id: "ed3", name: "Shadow Reef", img: {url: "180px-The_Ambassador_(boss_portal)_texture.webp", width: 40,}, target: {"origin": {"x": 3511, "y": 3692, "level": 0}}},
      {
        id: "ed4",
        name: "Zamorakian Undercity",
        img: {url: "The_Zamorakian_Undercity_(boss_portal)_texture.png", width: 40,},
        target: {"origin": {"x": 1759, "y": 1341, "level": 0}}
      },
    ],
    access: [
      {
        id: "left",
        type: "entity",
        name: {name: "Boss portal", kind: "static"},
        action_name: "Teleport",
        clickable_area: {"origin": {"x": 3289, "y": 10154, "level": 0}, "size": {"x": 3, "y": 1}}
      },
      {
        id: "right",
        type: "entity",
        name: {name: "Boss portal", kind: "static"},
        action_name: "Teleport",
        clickable_area: {"origin": {"x": 3296, "y": 10154, "level": 0}, "size": {"x": 4, "y": 1}, "data": "Cw=="}
      },
    ]
  },
  {
    type: "teleports",
    id: "portmasterkags",
    name: "Portmaster Kags",
    animation_ticks: 1,
    img: {url: "portmasterkags.webp", height: 32},
    spots: [
      {id: "sunkenpyramid", name: "Sunken Pyramid", target: {"origin": {"x": 3032, "y": 2672, "level": 0}}, code: "2", menu_ticks: 1},
      {id: "crondispyramid", name: "Crondis' Pyramid", target: {"origin": {"x": 3273, "y": 2644, "level": 0}}, code: "3", menu_ticks: 1},
      {id: "jaldraocht", name: "Jaldraocht", target: {"origin": {"x": 3254, "y": 2882, "level": 0}}, code: "4", menu_ticks: 1},
      {id: "nardah", name: "Nardah", target: {"origin": {"x": 3373, "y": 2931, "level": 0}}, code: "5", menu_ticks: 2},
      {id: "pollnivneach", name: "Pollnivneach", target: {"origin": {"x": 3377, "y": 2962, "level": 0}}, code: "6", menu_ticks: 2},
      {id: "dominiontower", name: "Dominion Tower", target: {"origin": {"x": 3373, "y": 3080, "level": 0}}, code: "7", menu_ticks: 2},
    ],
    access: [
      {
        id: "menaphos",
        type: "entity",
        name: {name: "Portmaster Kags", kind: "npc"},
        action_name: "Travel",
        clickable_area: {"origin": {"x": 3122, "y": 2631, "level": 0}},
        cursor: "talk"
      }
    ]
  }, {
    type: "teleports",
    id: "shatteredworldsteleport",
    name: "Shattered Worlds teleport",
    animation_ticks: default_teleport_ticks,
    menu_ticks: 0,
    spots: [
      {id: "shatteredworlds", name: "Shattered Worlds", target: {"origin": {"x": 3166, "y": 3161, "level": 0}, "size": {"x": 5, "y": 5}, "data": "/zv/AQ=="}}
    ], access: [
      {id: "scroll", type: "item", name: {kind: "item", name: "Shattered Worlds teleport"}, action_name: "Teleport", img: {url: "Shattered_Worlds_teleport_scroll.webp"}}
    ]
  }, {
    type: "teleports",
    id: "clanvexillum",
    name: "Clan vexillum",
    animation_ticks: 8,
    menu_ticks: 1,
    spots: [
      {id: "falador", name: "Falador", target: {"origin": {"x": 2964, "y": 3282, "level": 0}, "size": {"x": 5, "y": 5}}, code: "1"}
    ],
    access: [
      {id: "vexillum", type: "item", name: {kind: "item", name: "Clan vexillum"}, action_name: "Teleport", img: {url: "clanvex.webp"}}
    ]
  }, {
    type: "teleports",
    id: "memorystrands",
    name: "Memory strands",
    animation_ticks: 3,
    menu_ticks: 0,
    spots: [
      {id: "hallofmemories", name: "Hall of Memories entrance", target: {"origin": {"x": 2265, "y": 3551, "level": 0}, "size": {"x": 3, "y": 5}}}
    ],
    access: [
      {id: "memorystrands", type: "item", name: {kind: "item", name: "Memory stands"}, action_name: "Teleport", img: {url: "memory_strand.webp"}}
    ]
  }, {
    type: "teleports",
    id: "leelasfavour",
    name: "Leela's favour",
    animation_ticks: 4,
    menu_ticks: 1,
    spots: [
      {id: "imperial", name: "Imperial District", target: {origin: {"x": 3176, "y": 2729, "level": 0}}, code: "1"},
      {id: "merchant", name: "Merchant District", target: {origin: {"x": 3223, "y": 2782, "level": 0}}, code: "2"},
      {id: "port", name: "Port District", target: {origin: {"x": 3213, "y": 2627, "level": 0}}, code: "3"},
      {id: "worker", name: "Worker District", target: {origin: {"x": 3156, "y": 2796, "level": 0}}, code: "4"},
      //{id: "soulobelisk", name: "Soul Obelisk", target: null, code: "5"},
      {id: "shiftingtombs", name: "Shifting Tombs", target: {origin: {"x": 2078, "y": 6952, "level": 0}}, code: "6"},
      {id: "sophanemslayerdungeon", name: "Sophanem Slayer Dungeon", target: {origin: {"x": 3289, "y": 2708, "level": 0}}, code: "7"},
    ],
    access: [
      {id: "item", type: "item", name: {kind: "item", name: "Leela's favour"}, action_name: "Teleport", img: {url: "Leelas_favour.webp"}}
    ],
  },
  {
    type: "teleports",
    id: "delversanklet",
    name: "Delver's anklet",
    img: {url: "delvers_anklet.png"},
    menu_ticks: 2,
    animation_ticks: default_teleport_ticks,
    spots: [
      {
        id: "brimhavendungeon",
        target: {"origin": {"x": 2638, "y": 9593, "level": 2}},
        code: "1",
        name: "Brimhaven Dungeon",
      },
      {
        id: "fremennikslayerdungeon",
        target: {"origin": {"x": 2729, "y": 10021, "level": 0}},
        code: "2",
        name: "Fremennik Slayer Dungeon",
      },
      {
        id: "polyporedungeon",
        target: {"origin": {"x": 4654, "y": 5427, "level": 1}},
        code: "3",
        name: "Polypore Dungeon",
      },
    ],
    access: [{
      id: "anklet",
      type: "item",
      name: {name: "Delver's anklet", kind: "item"},
      action_name: "Rub",
      can_be_in_pota: true
    }]
  },
//TODO: Eagle transport system
//TODO: Canoes
//TODO: Orthen Teleport network
//TODO: Anachronia teleport (totems)
//TODO: Boss portals
// TODO: Slayer masks
// TODO: Ritual Site teleport incantation
  // Spirit tree access points
]

export default raw_data
