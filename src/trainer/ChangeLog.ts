import Properties from "./ui/widgets/Properties";
import * as lodash from "lodash";
import {NisModal} from "../lib/ui/NisModal";
import {List} from "../lib/ui/List";

export namespace Changelog {

  type Layout = Properties

  type LogEntry = {
    version: number,
    silent?: boolean,
    notification?: string,
    date: Date,
    title: string,
    render: (_: Layout) => void
  }

  export const log: LogEntry[] = lodash.sortBy<LogEntry>([{
    version: 24,
    date: new Date(Date.parse("2024-12-05")),
    title: "Scan Overlay Updates",
    render: layout => {
      layout
        .row(new List()
          .item("Added a second minimap overlay for the double ping range in addition to the triple ping range on scans.")
          .item("The double and triple ping range can be toggled on/off independently from each other.")
          .item("Added an option to manually select the minimap scaling instead of trying to automatically detect it.", new List()
            .item("This is the new default because automatic zoom detection has some serious flaws.")
            .item("Automatic zoom detection will remain as an experimental feature.")
          )
        )
        .paragraph("Next monday, the update to slider puzzles will release. To quickly evaluate the effects of this change, we need the appropriate crowd-sourced data. Crowdsourcing is powered by users of Clue Trainer that opt in for data collection available in the 'Crowdsourcing' section in the settings.")
    }
  }, {
    version: 23,
    date: new Date(Date.parse("2024-11-26")),
    title: "Seal Slider Fix",
    render: layout => {
      layout
        .row(new List()
          .item("Enabled support for the seal slider image used to free Mephisto in the Infernal Source.")
        )
    }
  }, {
    version: 22,
    date: new Date(Date.parse("2024-11-25")),
    title: "Fixes for the 'Use solution of previous step' option.",
    render: layout => {
      layout
        .row(new List()
          .item("Fixed that scans not using a scan tree method would not act as expected with regards to the 'Use solution of previous step' option for compasses.")
          .item("Regular text clues will now also provide their solutions for the 'Use solution of previous step' option for compasses.", new List()
            .item("This only really benefits the O EASTERN WISHES master clue."))
          .item("Fixed a bug that could cause crashes when examining scan tree methods outside of Alt1.")
        )
    }
  }, {
    version: 21,
    date: new Date(Date.parse("2024-11-25")),
    silent: true,
    title: "Fixing the Bugfix",
    render: layout => {
      layout
        .row(new List()
          .item("Added more error resilience to the minimap zoom detection, which caused the minimap overlay to not appear at all.")
        )
    }
  }, {
    version: 20,
    date: new Date(Date.parse("2024-11-25")),
    title: "Bugfixes",
    render: layout => {
      layout
        .row(new List()
          .item("Reduced erratic behaviour of the scan range minimap overlay in snowy areas.")
          .item("Fixed a bug that caused the slider solver to crash when hovering the 'Hint' button immediately after opening the puzzle.")
          .item("Fixed a critical typo that confused two very distinct types of aquatic creatures in a medium clue.")
        )
    }
  }, {
    version: 19,
    date: new Date(Date.parse("2024-11-17")),
    silent: true,
    title: "Internal Tooling Fixes",
    render: layout => {
      layout
        .row(new List()
          .item("Fixed a math bug causing tile transforms for entity instances to be broken.")
          .item("Added a filter safeguard to remove entity transports with zero actions.")
          .item("Updated the tile collision data.")
        )
    }
  }, {
    version: 18,
    date: new Date(Date.parse("2024-11-17")),
    title: "Clue Reader Bugfix",
    render: layout => {
      layout
        .row(new List()
          .item("(Maybe) Fixed a newly introduced bug that prevented scans from being read.")
          .item("Added a notification when the clue reader is not fully initialized when trying to solve a clue.")
        )
    }
  }, {
    version: 17,
    date: new Date(Date.parse("2024-11-16")),
    title: "Scan Range Minimap Overlay",
    render: layout => {
      layout
        .row(new List()
          .item("Added a scan range overlay for the minimap.", new List().item("This can be toggled on or off in the new settings page for scans."))
          .item("Fixed an internal error when manually selecting a compass clue via the search function.", new List().item(
            "With this fix, you can now use the 'Solve'-page to explore pathing for compass spots by clicking on their markers."
          ))
          .item("Added a popup recommending to watch the tutorial when opening Clue Trainer for the first time after installation.")
        )
    }
  }, {
    version: 16,
    date: new Date(Date.parse("2024-10-10")),
    silent: true,
    title: "Compass Overlay Fix",
    render: layout => {
      layout
        .row(new List()
          .item("Fixed a timing issue that could cause the compass overlay to persist after the compass already ended.")
        )
    }
  }, {
    version: 15,
    date: new Date(Date.parse("2024-10-10")),
    silent: true,
    title: "Solving Bugfix",
    render: layout => {
      layout
        .row(new List()
          .item("Fixed a bug that caused parts of the solving interface to not appear when reading a scan.")
        )
    }
  }, {
    version: 14,
    date: new Date(Date.parse("2024-10-08")),
    title: "Large internal change and small visible changes",
    render: layout => {
      layout
        .row(new List()
          .item("Large internal refactor of screen capturing to optimize for multiple captures being done in parallel.",
            new List()
              .item("This is a significant internal change that could potentially lead to unforeseen issues, despite extensive testing. Please let me know if you experience any issues.")
          )
          .item("Fixed a bug that caused lockbox optimization to reset down to 2 on reloading.")
          .item("Separated the method selection dropdown into its own element instead of being embedded in the path list or the scan tree view.")
          .item("On scans, the entire lines can now be clicked instead of just the small button containing the pulse icon.")
        )
    }
  }, {
    version: 13,
    date: new Date(Date.parse("2024-10-03")),
    silent: true,
    title: "Lockbox Hotfix",
    render: layout => {
      layout
        .row(new List()
          .item("Changed the desync detection for lockboxes for a much more stable and reliable implementation.")
        )
    }
  }, {
    version: 12,
    date: new Date(Date.parse("2024-10-03")),
    title: "Lockbox Changes",
    render: layout => {
      layout
        .row(new List()
          .item("Tweaked the lockbox solver so it does not switch to a different solution in the middle of solving.",
            new List()
              .item("Instead of independently solving the puzzle on each tick, the solver now prefers the solution closest to the previously known solution. Solution minimization is only applied on the initial solve.")
          )
          .item("Extended the lockbox reader to try to detect client desyncs and pause the overlay so that it does not display a wrong solution.",
            new List()
              .item("Occasionally, the puzzle state shown by the game client desyncs from the actual server state. The reader now tries to detect this based on the number of clicks you would need to have done to get to this state and unplausible states are discarded. This is considered experimental, so let me know if you encounter issues.")
          )
          .item("The optimization mode for lockboxes can now be turned up to 5. Values above 2 encourage the solver to avoid tiles that need to be clicked 2 times.",
            new List()
              .item("If you're thinking 'this is dumb, why would I ever do this?': You're right, please go and try to convince Ngis."))
          .item("Fixed some right click options for lodestones not being detected when hovering it and pressing Alt+1 on compasses.")
        )
    }
  }, {
    version: 11,
    date: new Date(Date.parse("2024-09-22")),
    title: "Bugfixes",
    render: layout => {
      layout.row(new List()
        .item("Fixed a bug that caused certain paths to not be correctly split into sections, sometimes resulting in the 'zoom to space' symptom (for example at the Edmond medium clue).")
        .item("Added a workaround for a rare issue where a master compass would reset and be redetected as an elite compass.")
        .item("Added 2 missing tiles to the landing area for the turtle island teleport, which sometimes caused problems with master compasses.")
        .item("Slightly increased the time required for a stationary compass to be counted to mitigate lag spikes.")
      )
    }
  }, {
    version: 10,
    silent: true,
    date: new Date(Date.parse("2024-09-20")),
    title: "Timing Bugfix",
    render: layout => {
      layout.row(new List()
          .item("Fixed a rare timing bug where a completed puzzle could abort the following clue. This was noticeable for compasses following a celtic knot.")
          .item("Reduced the size of log files.")
        )
        .paragraph("This is a bit of a speculative fix, because the source of the reported issue is not 100% confirmed.")
    }
  }, {
    version: 9,
    date: new Date(Date.parse("2024-09-18")),
    title: "Bugfixes",
    render: layout => {
      layout.row(new List()
        .item("Fixed a minor bug that caused an exception when outside of Alt 1.")
        .item("Fixed a bug that caused teleport icons on the map to not update on changes to the settings, requiring a reload.")
      )
    }
  }, {
    version: 8,
    date: new Date(Date.parse("2024-09-09")),
    title: "Migration and update notices",
    render: layout => {
      layout.row(new List()
        .item("Added a data export/import feature. Data exports will include local/imported method packs, method preferences, and all of your settings.")
        .item("Added a migration notice to remind users that are still on the old 'leridon.github.io/rs3scantrainer' URL to migrate to 'cluetrainer.app'.",
          new List()
            .item("The legacy URL 'leridon.github.io/rs3scantrainer' will stop being available after 2024-10-31.")
        )
        .item("Added an update reminder for users that are on Alt 1 1.5.6.")
        .item("Reduced the default setting for slider solve time to 1 second down from 2 seconds.")
        .item("Fixed a bug that caused the map to zoom very far out on certain steps.", new List()
          .item("This still isn't optimal, but it's an improvement over the previous situation."))
        .item("Enabled the option to automatically draw the first compass arrow for back to back arc compasses.")
      )
    }
  }, {
    version: 7,
    date: new Date(Date.parse("2024-08-11")),
    title: "Transport Fixes and Permission Checking",
    render: layout => {
      layout.row(new List()
        .item("Fixed issues with various transports missing in the path editor and many actions being named 'Unnamed Action'.")
        .item("Clue Trainer now checks if all required permissions are granted on startup and opens and explanation how to grant them if they are not.")
      )
    }
  }, {
    version: 6,
    date: new Date(Date.parse("2024-07-14")),
    title: "Celtic Knot Bugfix",
    render: layout => {
      layout.row(new List()
        .item("Fixed a bug that caused celtic knots to revert to the 'Not enough information' state mid-solve.")
        .item("Fixed the position of Wellington for sandy clues.")
      )

      layout.header("What went wrong?", "left")
      layout.paragraph("While solving celtic knots, there's a step called 'unification' of puzzle states. This joins the previously known state of the puzzle with the new state. It continuously updates what the solver knows about the puzzle and is required when there is not enough information initially, and to make updating the overlay continuously possible. There was a rare case where unification actually caused information to be lost, which in turn caused the solver to not find a solution anymore.")
    }
  }, {
    version: 5,
    date: new Date(Date.parse("2024-07-12")),
    title: "Slider Bugfix",
    render: layout => {
      layout.row(new List()
        .item("Fixed a bug that caused invalid moves for slider puzzles to be displayed.")
      )

      layout.header("What went wrong?", "left")
      layout.paragraph("In the new solving algorithm there is a point where the slider state needs to be reflected along the main diagonal (top left to bottom right). The datastructure that describes the slider state contains the layout of the 25 tiles and for optimization reasons also the position of the blank tile and the last performed move. The latter two were not correctly updated when reflecting the state, causing invalid solutions to be produced.")
    }
  },
    {
      version: 4,
      date: new Date(Date.parse("2024-07-11")),
      title: "Better Logging",
      render: layout => {

        layout.paragraph("This update improves logging to provide more useful information for debugging in the future. Logs are now json files instead of plaintext and can contain json data or images as attachments.")
        layout.paragraph("As a reminder, you can access and save log files by pressing F6 while Clue Trainer is focussed. Saved log files can be viewed using the Log Viewer in the development menu accessible with F4.")
        layout.row(new List()
          .item("Improved the log format and Log Viewer to be more useful.")
          .item("Added more extensive logging for a current bug involving invalid slider solutions.")
          .item("Celtic Knots now require two consecutive identical reads for the new state to be considered valid. This makes the knot solver more resilient against wrong reads.")
        )
      }
    },
    {
      version: 3,
      date: new Date(Date.parse("2024-07-10")),
      title: "New Method",
      render: layout => {
        layout.row(new List()
          .item("Added an alternative route without HSR for the medium clue in the terrorbird pen.")
        )
      }
    },
    {
      version: 2,
      date: new Date(Date.parse("2024-07-09")),
      title: "Slider Bugfix",
      render: layout => {
        layout.row(new List()
          .item("Fixed a bug with error recovery on sliders that caused impossible moves to be displayed.")
        )
      }
    },
    {
      version: 1,
      date: new Date(Date.parse("2024-07-09")),
      notification: "Slider Puzzles now have faster solutions",
      title: "New Solving Algorithm for Slider Puzzles",
      render: layout => {
        layout.paragraph(`This update introduces a new solving algorithm for sliding puzzles. The new algorithm is based on a precomputed database that is around 170MB large and will be downloaded when the first puzzle is encountered.`)
        layout.paragraph(`Due to how the algorithm works, this has a more significant effect on multitile moves (mouse mode) than on singletile moves (keyboard mode). Benchmarks suggest a move count reduction of up 30% for multitile moves and up to 10% for singletile moves.`)
        layout.paragraph(`The new algorithm has been developed in cooperation with discord user Shao, who helped out massively with the algorithmic details and the required math.`)
        layout.row(new List()
          .item("Added a new solving algorithm for slider puzzles.")
          .item("Fixed a bug that caused puzzles to not be read with lava in the background.")
          .item("Fixed a bug that caused error recovery to display invalid moves.")
        )
      }
    },
    {
      version: 0,
      date: new Date(Date.parse("2024-06-28")),
      title: "New Methods by Ngis",
      render: layout => {
        layout.row(new List()
          .item("Added 16 missing Tetracompass spots.")
          .item("Added a method pack for tetracompass spots.")
          .item("The method pack for master clues is now builtin.")
          .item("Added a new Falador scan method that starts with the amulet of nature teleport and is 3 ticks faster on average (assuming perfect execution and no loading screens as usual).")
          .item("Method descriptions and other meta-information are now shown in a tooltip when hovering a method in the method selection dropdown.")
        )
      }
    },
    {
      version: -1,
      date: new Date(Date.parse("2024-06-25")),
      notification: "Clue Trainer now supports Sandy Clues and Tetracompasses",
      title: "Sandy Clues and Tetracompasses",
      render: layout => {
        layout.paragraph(`This update introduces support for sandy clues and tetracompasses.`)
        layout.paragraph(`Also, if you want to support Clue Trainer you can now do so on the newly created <a href='https://ko-fi.com/I2I4XY829' target=”_blank”>KoFi page</a>.`)
        layout.row(new List()
          .item("Sandy Clues can now be solved like any other clue.")
          .item("Tetracompasses can be solved by switching to the 'Tetras' tab in the sidebar.")
          .item("Added in-app update notifications.")
          .item("Moved step information for filter results in the 'Methods' tab to a tooltip.")
        )
      }
    },
    {
      version: -2,
      date: new Date(Date.parse("2024-06-18")),
      title: "Slider Bugfix",
      render: layout => {
        layout.row(new List()
          .item("Fixed an issue with the slider reader that caused misreads for some sliders, particularly the tree motive on low graphic settings.")
        )
      }
    },
    {
      version: -3,
      date: new Date(Date.parse("2024-06-16")),
      title: "Compass Bugfixes",
      render: layout => {
        layout.row(new List()
          .item("Fixed a bug that caused pretty much every spot to be considered colinear to large triangulation spots, for example after a scan.")
          .item("Fixed a rendering bug for compass beams where their visual representation didn't match the area that was considered internally.")
          .item("Improved the calculation of location uncertainty to properly consider the angle of the beam.",
            new List()
              .item("The previous formula overestimated this quite significantly in most cases. The new version takes the angle into account, so that for angles that aren't perpendicular to the longest diagonal of the area the uncertainty is no longer overestimated.")
          )
          .item("Compass beams now start at the edge of the origin area instead of the center, so that all spots inside of it are properly considered.",
            new List()
              .item("This is relevant for large areas, for example when using the entirety of a scan area as the origin of a compass beam.")
          )
          .item("Right-Click teleport options on Luck of the Dwarves are now recognized when pressing Alt+1 on them to set a compass position.")
          .item("Added a workaround to hopefully fix phantom clicks on map entities.")
        )
      }
    },
    {
      version: -4,
      date: new Date(Date.parse("2024-06-14")),
      title: "Miscellanious",
      render: layout => {
        layout.row(new List()
          .item("Updated target areas of teleports to daemonheim.")
          .item("Added support for Right Click -> Alt + 1 for Monastery, Skeletal Horror and Manor Farm, as well as the most recently used lodestone when right clicking the home teleport button on the map.")
          .item("Fixed an occasional bug that caused wrong angles to be committed when coming from spinning compass.")
        )
      }
    },
    {
      version: -5,
      date: new Date(Date.parse("2024-06-11")),
      title: "Bugfixes",
      render: layout => {
        layout.row(new List()
          .item("Switched to a custom implementation of modals (settings, puzzles, etc.). This lacks some of the fancy animations, but crucially also lacks the bugs causing the grayed overlay rendering clue trainer unusable.")
          .item("Fixed a long standing bug with base64 exports/imports of method packs and paths.")
        )
      }
    },
    {
      version: -6,
      date: new Date(Date.parse("2024-06-10")),
      title: "New Compass Reader and Daemonheim Dig Site",
      render: layout => {
        layout.row(new List()
          .item("The new compass reader is here. The new algorithm is not affected by the game's rendering inconsistency and will therefore fix some of the compass issues experienced over the last week.")
          .item("Updated the collision data with today's game update.")
          .item("Updated a compass spot that changed with today's update.")
          .item("Added the new teleport to the daemonheim dig site.")
          .item("Added target areas for the remaining skilling steps in master clues.")
          .item("Updated daemonheim compass spot paths.")
          .item("Added HSR-less alternative routes for 3 compass spots.")
        )
      }
    },
    {
      version: -7,
      date: new Date(Date.parse("2024-06-06")),
      title: "Compass fixes",
      render: layout => {
        layout.row(new List()
          .item("Added internal log keeping. You can now press F6 while the app is focused to view and save the log file. It's still mirrored to the browser console, so if you're comfortable with that, you can still use it.")
          .item("Reduced colinearity threshold to 5° down from 10°.")
          .item("Increased pixel count required for a compass to go into the concealed state.")
          .item("Fixed a bug that caused compass lines to not be drawn after the angle was committed.")
          .item("Fixed bug that caused the compass reader to go into the 'Spinning' state for a tick when coming from 'Concealed', which in turn caused the next read angle to be auto-committed.")
          .item("Added error mitigation for the inconsistent position of the north-indicator on the compass interface.")
          .item("Recalibrated the compass reader with the first fix in place to be hopefully accurate again.")
          .item("Reduced the assumed inaccuracy again because hopefully this fix will cause it to be consistently accurate.")
        )
      }
    },
    {
      version: -8,
      date: new Date(Date.parse("2024-06-05")),
      title: "More compass improvements and a new URL",
      render: layout => {
        layout.paragraph("Clue Trainer has a new URL. You can now access it at <a href='https://cluetrainer.app'>cluetrainer.app</a>. The links in the channel description, guide page, bot command etc. have been updated and any new installations should use that URL. Existing users can switch over if they want to, but should be aware that you will need to restore your settings, as well as local and imported method packs manually. The current URL will continue to work for the time being. When it's time for it to go offline (so I can finally rename the GitHub repository) there will be plenty of notice and a way to carry over your data.")

        layout.row(new List()
          .item("The previously shelved feature to use the solution of the previous clue step had a very short shelf life and is now available after some additional improvements.",
            new List()
              .item("You can activate it in the compass settings.")
              .item("When activated, the initially read angle of the compass will be used to draw an arrow from the position of the previous step's solution area. For now, this is limited to elite compasses.",
                new List()
                  .item("If the previous clue step was a scan, this will only work if you followed the scan tree until the remaining spots are in a reasonably small rectangle.")
                  .item("If the previous clue was also a compass and multiple spots were in the intersection of the beams, the smallest rectangle containing all spots will be used.")
              )
              .item("Your selected triangulation preset will load after this initial arrow. There's an option to invert the sequence if the previous solution is used in case you rely on ending the triangulation at a certain spot (for example south feldip hills for the spirit tree).")
              .item("There's an option to skip spots of the preset sequence if they are close to co-linear to an existing beam.")
          )
          .item("The settings menu for compasses has been cleaned up. Detailed explanations of the individual settings have been moved into a tooltip of a small info-icon.")
          .item("You can now customize the color of the triangulation beams.")
          .item("The compass solver UI has been reverted to a horizontal header and now contains a reset button.")
          .item("Various issues with the compass reader that caused wrong 'Concealed' readings have been resolved.")
          .item("The compass reader now detects if you are on top of the target spot, which no longer closes the compass solver.")
          .item("Added scan routes for the Elven Lands, Brimhaven Dungeon, Mos Le'Harmless and Fremennik Slayer Dungeon, as usual courtesy of Ngis.")
          .item("The list containing details for the path on the map has been restored due to popular demand.")
        )
      }
    },
    {
      version: -9,
      date: new Date(Date.parse("2024-06-02")),
      title: "Small compass improvements",
      render: layout => {
        layout.row(new List()
          .item("Tweaked pixel-count thresholds for concealed compasses to be less strict.")
          .item("Added some debug logging for the compass reader.")
          .item("Actually disabled the incomplete feature that used the area of the previous clue step as the first triangulation point. It was already supposed to be disabled, but was missing the check to do so. Sorry if you found the current, broken version to be useful already, it will make a comeback in a hopefully less broken state.")
        )
      }
    },
    {
      version: -10,
      date: new Date(Date.parse("2024-06-01")),
      title: "Improved compass solver and general improvements.",
      render: layout => {
        layout.header("Compass Solver", "left")

        layout.row(new List()
          .item("The UI for the compass solver has been redesigned.")
          .item("The compass reader has been recalibrated to be even more accurate than before. It can also detect the use of MSAA and adjust accordingly.")
          .item("The compass solver now supports showing paths from method packs.",
            new List()
              .item("The shown path defaults to the spot closest to all the triangulation lines. Click a marker to change the selection if necessary.")
          )
          .item("A full set of compass methods is included. Huge thanks to @Dongus Bungholius, @Mr Cob , @treborsmada , @Xindrjayzda for starting these back in march and @Ngis for reviewing them all and compiling them in a single set.")
        )

        layout.header("General", "left")
        layout.row(new List()
          .item("Optimized rendering of gridlines and teleports on the map for significant performance improvements.")
          .item("Removed ability icons for rendered paths to reduce map clutter.")
          .item("Added optional note-areas to dives and running-steps in the path editor. Using these to simplify existing paths is WIP.")
          .item("Rendering for dives now uses distinct arrow shapes for far-clickable and precise dives.",
            new List()
              .item("This relies on a change in the dataformat, so you need to migrate any existing paths you have. You can find this option by right-clicking the method pack in the Methods tab.")
          )
          .item("Errors and warnings in the path editor are now shown in a minimized format to save space. Hover over them to see the details.")
          .item("Fixed the base64 export for method packs that's apparently been broken for ages.")
          .item("Entity-Tooltips now behave much smoother when the entity is right-clicked.")
          .item("When drawing a run step in the path editor, the number of tiles this covers is now shown as part of the preview.")
          .item("Teleport customization now starts out as empty instead of the Clue Chasers recommendations.")
          .item("Updated methods for one easy and two hard clues.")
        )
      }
    },

  ], e => -e.version)

  export const latest_patch = log[0]

  export class Modal extends NisModal {
    constructor() {
      super();

      this.setTitle(`Changelog (v${latest_patch.version})`)
    }

    render() {
      super.render();

      const layout = new Properties().appendTo(this.body)

      Intl.DateTimeFormat("de-de", {
        dateStyle: "medium",
        timeStyle: "short"
      })

      layout.row(
        "<div style='text-align: center'><a href='https://ko-fi.com/I2I4XY829' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a></div>"
      )

      layout.paragraph('If you enjoy Clue Trainer, please consider supporting continuous development of Clue Trainer at <a href="https://ko-fi.com/I2I4XY829" target="_blank"><img class="ctr-clickable" height="12px" src="assets/icons/kofi.webp"> KoFi</a>.')


      layout.paragraph('You can also join the <a href="https://discord.gg/cluechasers" target="_blank"><img src="assets/icons/cluechasers.png" height="12px">Clue Chasers discord</a> to leave praise and criticism, report issues, request features, get support or just come by and say hi in the <a href="https://discord.com/channels/332595657363685377/1103737270114209825" target="_blank">#clue-trainer</a> channel.')

      layout.divider()

      log.forEach(entry => {
        layout.header(c().text(`${entry.date.toLocaleDateString("en-gb")} - ${entry.title}`))

        entry.render(layout)

        layout.divider()
      })

      layout.paragraph("No historic patch notes available beyond this point in time.")
    }
  }
}