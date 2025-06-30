import Properties from "./ui/widgets/Properties";
import {NisModal} from "../lib/ui/NisModal";
import {List} from "../lib/ui/List";
import {C} from "../lib/ui/constructors";
import {util} from "../lib/util/util";

export namespace Changelog {

  import div = C.div;
  import italic = C.italic;
  import Order = util.Order;
  import tap = util.tap;
  type Layout = Properties

  export type Version = {
    version: number,
    release_date?: Date,
    build_info?: {
      commit_sha: string,
      build_timestamp: Date,
      is_beta_build?: boolean
    }
  }

  export namespace Version {
    import Order = util.Order;

    export function isBeta(self: Version): boolean {
      return self?.build_info?.is_beta_build
    }

    export function lift(self: Version | number): Version {
      if (typeof self == "number") return {version: self}
      else return self
    }

    export function isNewerThan(a: Version, than: Version): boolean {
      if (a.version > than.version) return true
      if (a.version == than.version && a.build_info?.is_beta_build && than.build_info?.is_beta_build) return new Date(a.build_info.build_timestamp).valueOf() > new Date(than.build_info.build_timestamp).valueOf();

      return false
    }

    export function asString(self: Version): string {
      if (self.build_info?.is_beta_build) return `v${self.version}B-${self.build_info.commit_sha}`
      else return `v${self.version}`
    }

    export const natural_order = Order.chain<Version>(
      Order.comap(Order.natural_order, e => e.version),
      Order.comap(Order.natural_order, e => e.build_info?.build_timestamp?.valueOf() ?? 0),
    )

    export function date(self: Version): Date {
      return self.release_date ?? self.build_info?.build_timestamp ?? new Date("Unknown")
    }
  }

  export type LogEntry = {
    version: Version,
    silent?: boolean,
    notification?: string,
    title: string,
    render: (_: Layout) => void,
  }

  export const v50: LogEntry = {
    render: layout =>
      layout
        .row(new List()
          .item("Updated map collision data to the latest game version.")
          .item("Updated tetracompass methods that used the Games necklace, which isn't part of the recommended solving preset.")
          .item("Added new scan methods that utilize the new Delver's anklet for Fremennik Slayer Dungeon and Brimhaven Dungeon.", new List()
            .item(italic("Router's note: These should be considered drafts and are subject to improvements in the future.")))
          .item("Added a new method for the Ramokee Skinweaver anagram in masters using the Delver's anklet.")
        ),
    notification: "New methods are available!",
    title: "New Methods using Delver's anklet",
    version: {version: 50, release_date: new Date(Date.parse("2025-06-18"))},
  }

  export const v49: LogEntry = {
    render: layout =>
      layout
        .paragraph("This update brings a variety of bugfixes as well as new teleports from today's game update. Updated methods are being worked on and will arrive later in the week.")
        .row(new List()
          .item("For paths with multiple sections, the last section will now be shown by default unless overridden manually.",
            new List()
              .item(italic("Dev note: This should be a more reasonable default for most cases. Clue Trainer will still remember your preferred sections if you manually selected them at any point."))
          )
          .item("Fixed a race condition that would sometimes cause inconsistent zooming for compass spots.")
          .item("Fixed the location of the Portmaster Kags teleport to Pollnivneach.")
          .item("Removed a method for an elite compass spot using the wrong Portmaster Kags teleport.")
          .item("Fixed the area for the emote clue in the Varrock palace library.")
          .item("Fixed a bug that caused triangulation lines to be added for hidden spots after a solution was already found.")
          .item("Fixed the area for the emote clue in front of the Menaphos library.")
          .item("Fixed a bug that caused desert environments to still be detected as slider puzzles after the slider was closed. ", new List()
            .item(italic("Dev note: There was a tiny but very impactful error in the formula used to compare two tiles. Fixing this makes the math more sound and fixes the instances where the wrong results were noticeable, but could also lead to unforeseen consequences for other puzzles. If you encounter any new issues for slider puzzles, lockboxes, or knots, please report them in the usual places. If you do, please include a screenshot of the wrongly recognized puzzle without any Clue Trainer overlay visible."))
          )
          .item("Fixed a bug that caused the 'Transcript' setting for treasure maps to be reset on a reload.")
          .item("Fixed that Cloudflare's CDN would not cache the large binary files for the slider puzzle solver, leading to slow load times on occasion.")
          .item("Added the Delver's Anklet teleports.")
          .item("Updated the position of the crafting guild teleport.")
        ),
    notification: "Several bugfixes and new teleports have dropped.",
    title: "Bugfixes and new teleports",
    version: {version: 49, release_date: new Date(Date.parse("2025-06-16"))},
  }


  export const v48: LogEntry = {
    render: layout =>
      layout
        .row(new List()
          .item("Fixed that all builtin methods for elite scans were missing.")
        )
    ,
    title: "Hotfix for Missing Scan Methods",
    version: {version: 48, release_date: new Date(Date.parse("2025-06-08"))}
  }

  export const v47: LogEntry = {

    render: layout =>
      layout
        .header("Updated Paths")
        .paragraph("Ngis has teamed up with Xindrjayzda to bring you a fully revamped set of suggested paths for compass spots. Feedback on this overhaul is very welcome and appreciated, so please let us know your thoughts and suggestions in the usual places.")
        .row(new List()
          .item("Overhauled all paths for elite compass spots.")
          .item("Renamed elite compass methods for consistency.")
          .item("Added a new route for a tetracompass spot using a recently added shortcut.")
          .item("Added a new route for a medium step in Seers' village using the amulet of nature.")
        )
        .header("Changes to the Compass Solver")
        .row(new List()
          .item("When manually setting a triangulation spot, entries from the preconfigured triangulation strategy are no longer replaced. Instead, a new entry is added to the bottom if necessary.")
          .item("When the compass spot has been uniquely determined, remaining triangulation spots are now hidden instead of being deleted. They will reappear when a triangulation line is deleted. This is useful when you need to fix a mistake.")
        )
        .header("General")
        .row(new List()
          .item("Timing estimates for methods now account for the time it takes to dig, search a container, talk to a target, and solve a challenge scroll.", new List().item(italic("Dev note: Since it varies a lot between players, tick counts do not account for the time taken to solve puzzles, or fight wizards and double agents.")))
        )
    ,
    notification: "Compass Paths have been overhauled",
    title: "New Compass Paths and Behaviour Changes",
    version: {version: 47, release_date: new Date(Date.parse("2025-06-08"))}
  }

  export const v46: LogEntry = {

    render: layout =>
      layout
        .row(new List()
          .item("Added a new tool to the path editor that is able to do limited form of path finding by displaying all ability combinations that land in the target area.")
          .item("The path editor will now assume double surge and escape, as well as the mobile perk, when accessed via the sidebar menu.")
          .item("When the path editor was opened via the sidebar menu, there is now an option to edit the underlying assumptions.")
          .item("Fixed a bug where using an unreachable method of transportation resulted in invalid paths.")
          .item("Fixed a bug that caused the path editor to break when placing a redclick anywhere else than the center of a tile.")
          .item("Fixed the teleport area of the Traveller's necklace's teleport to the Wizard Tower.")
        ),
    title: "Path Editor Changes",
    version: {version: 46, release_date: new Date(Date.parse("2025-05-12"))}
  }

  export const v45: LogEntry = {

    render: layout =>
      layout.row(new List()
        .item("Added a new, faster scan route for Menaphos using Leela's favour.")
        .item("Added a new method for the Hamid hard step using Leela's favour.")
        .item("Added a new method for the master emote step in front of the Menaphos library using Leela's favour.")
        .item("Added a new method for the plover bird skilling step using Leela's favour.")
        .item("Fixed an issue causing the route for the decorated cooking urn master step to not be displayed.")
        .item("Added error notification when the Clue Reader fails.")
      ),
    title: "New Methods",
    notification: "New Methods have arrived",
    version: {version: 45, release_date: new Date(Date.parse("2025-04-09"))}
  }

  export const v44: LogEntry = {

    render: layout =>
      layout.row(new List()
        .item("Improved the accuracy of more than 50 teleport landing areas. ", new List()
          .item("Massive thanks to @Ngis, who spent ages teleporting to gather all these fixes.")
        )
        .item("Fixed the name of Challenge Mistress Fara.")
        .item("Fixed the area for the emote step in the garden of the max guild.")
        .item("Replaced DJR in the fairy ring recommendations for easy clues with CJR.")
        .item("Adjusted the detection threshold for map clues to cover more configurations.")
        .item("Added a method for an easy clue step in Canifis using the Kharyll teleport.")
        .item("Added Leela's favour teleports.")
      ),
    title: "Improved teleport area accuracy",
    version: {version: 44, release_date: new Date(Date.parse("2025-04-08"))}
  }

  export const v43: LogEntry = {

    render: layout => layout
      .header("General", "left")
      .row(new List()
        .item("Fixed a bug that caused solutions to tower puzzles to not appear for Runekit or Alt1 Electron users.")
        .item("Moved Knot, Tower, and Lockbox overlays to the new overlay tech so they disappear automatically when Clue Trainer closes.")
        .item("Fixed a bug that caused passage of the abyss overrides to only appear within paths.")
        .item("Added Memory strand teleport.")
        .item("Fixed a bug that caused methods for skilling steps to not be editable.")
      )
      .header("Method Pack Updates (by Ngis)", "left")
      .row(new List()
        .item("Medium Pack", new List()
          .item("Standardized method names.")
          .item("Added a method to a coordinate step in the Lumbridge Swamp using the Shattered Worlds teleport.")
          .item("Added a method for a map clue between Seer's village and Relekka using the Amulet of Nature.")
          .item("Added a method for a coordinate step west of Tree Gnome Village using the Amulet of Nature.")
        )
        .item("Hard Pack", new List()
          .item("Added a method for the Heckel Funch step using a Grand Seed Pod.")
        )
        .item("Master Pack", new List()
          .item("Standardized method names.")
        )
      )
    ,
    title: "Bugfixes and Method Updates",
    version: {version: 43, release_date: new Date(Date.parse("2025-03-09"))}
  }

  export const v42: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Updated the tetracompass method pack to utilize the new teleports and so paths land exactly on the target tile.")
        .item("Add missing location for Philippe Carnillean.")
        .item("Updated outdated collision data for the path editor (for real this time).")
        .item("Tetracompasses now consistently use the correct 1x1 excavation area.")
        .item("Add more detail to the tooltip for teleports when used in a path.")
        .item("Renamed methods for easy clues so the name indicates the primary method of transportation.")
      ),
    title: "New Tetracompass Methods",
    version: {version: 42, release_date: new Date(Date.parse("2025-03-06"))}
  }

  export const v41: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Added new methods utilizing the new Kharazi teleport for two hard clue steps.")
        .item("Added a new method for the emote clue at Jokkul's tent utilizing the new Mountain Camp teleport.")
        .item("Added a new scan method for Kharazi Jungle utilizing the new Kharazi teleport.")
        .item("Renamed methods for hard clues and elite scans so they clearly indicate which teleport they start with.")
        .item("Updated a method for a medium clue so the pack consistently uses the Varrock teleport relocated to the church.")
        .item("Updated the path editor collision data to the latest game version.", new List()
          .item(italic("Dev note: The visuals will lag behind until the runeapps map is updated."))
        )
      )
      .paragraph("As usual, many thanks to Ngis for providing the updated methods.")
    ,
    notification: "New methods using the new teleports have arrived",
    title: "New Methods",
    version: {version: 41, release_date: new Date(Date.parse("2025-03-04"))}
  }

  export const v40: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Added the new Anachronia and Lost Grove teleports from the normal spellbook.")
        .item("Added the new Western Kharazi Jungle and Mountain Camp teleports from the lunar spellbook.")
      )
      .paragraph("New paths utilizing these new teleports will be added as soon as possible.")
    ,
    title: "New Teleports",
    version: {version: 40, release_date: new Date(Date.parse("2025-03-03"))}
  }

  export const v39: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Increased the detection threshold for map clues to fix unrecognized steps.", new List()
          .item(italic("Dev note: You may observe false reads again when a map clue is only partially loaded. This part of the clue reader is legacy code and needs a full replacement in the future."))
        )
      ),
    title: "Clue Reader Bugfix",
    version: {version: 39, release_date: new Date(Date.parse("2025-02-20"))}
  }

  export const v38: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Fixed a bug that caused the map to not zoom in on the final compass spot when no method is selected for it.")
        .item("Zooming in for compasses now includes the closest teleport if that option is enabled.")
      ),
    title: "Bugfixes",
    version: {version: 38, release_date: new Date(Date.parse("2025-02-19"))}
  }

  export const v37: LogEntry = {

    render: layout => layout
      .row(new List()
        .item("Fixed a styling bug that caused puzzle modals to be weird and double scrollbars to appear.")
        .item("Fixed a bug with the scan panel overlay not disappearing when deactivated in the settings.")
        .item("Moved the info button on the scan status panel so it does not overlap with the text.")
      ),
    title: "Bugfixes",
    version: {version: 37, release_date: new Date(Date.parse("2025-02-19"))}
  }

  class ChangeLog {
    latest_patch: LogEntry
    entries: LogEntry[]

    constructor(entries: LogEntry[]) {
      this.entries = [...entries].sort(Order.reverse(Order.comap(Version.natural_order, e => e.version)))
      this.latest_patch = this.entries[0]
    }

    showModal(): void {
      new Modal(this).show()
    }
  }

  class ChangelogBuilder {
    private log: LogEntry[] = []

    tap(f: (_: this) => void): this {
      f(this)
      return this
    }

    release(number: number, title: string, release_date: Date): ChangeLogEntryBuilder {
      return this.wip(number, title)
        .releaseDate(release_date)
    }

    wip(number: number, title: string): ChangeLogEntryBuilder {
      const entry: LogEntry = {
        version: {version: number},
        title: title,
        render: layout => {}
      }

      this.log.push(entry)

      return new ChangeLogEntryBuilder(entry)
    }

    add(...entry: LogEntry[]): this {
      this.log.push(...entry)
      return this
    }

    compile(): ChangeLog {
      return new ChangeLog(this.log)
    }
  }

  class ChangeLogEntryBuilder {
    constructor(private entry: LogEntry) {}

    render(f: (_: Properties) => void): this {
      const old = this.entry.render
      this.entry.render = layout => {old(layout), f(layout)}

      return this
    }

    silence(): this {
      this.entry.silent = true
      return this
    }

    notification(notification: string): this {
      this.entry.notification = notification
      return this
    }

    list(f: (_: List) => void): this {
      return this.render(layout => layout.row(tap(new List(), f)))
    }

    releaseDate(date: Date): this {
      this.entry.version.release_date = date
      return this
    }
  }

  export const log: ChangeLog = new ChangelogBuilder()
    .tap(builder => {
        builder.release(52, "New Clue Spots", new Date(Date.parse("2025-06-30")))
          .list(l => l
            .item("Updated the position of the gnome coach.")
          )


        builder.release(51, "Editor Improvements and Bug Fixes", new Date(Date.parse("2025-06-22")))
          .list(l => l
            .item("Modified a few elite compass routes for easier execution.")
            .item("Fixed that the update notification would appear every time Clue Trainer is opened.")
            .item("Closing the page while in the method or path editor will now prompt for confirmation.")
            .item("The scan editor can now show additional timing statistics when hovering over the status icons of nodes in the tree view.")
          )


        builder.add(
          v50,
          v49,
          v48,
          v47,
          v46,
          v45,
          v44,
          v43,
          v42,
          v41,
          v40,
          v39,
          v38,
          v37,
          {
            version: {version: 36, release_date: new Date(Date.parse("2025-02-18"))},

            notification: "Cluepedia and reworked Scan Tree Solving has released!",
            title: "Scan Improvements and Cluepedia",
            render: layout => {
              layout
                .header("New Scan Tree Flow", "left")
                .row(new List()
                  .item("Added an interactive overlay usable to navigate scan trees without having to click in the Clue Trainer window.", new List()
                    .item("Interactive overlay buttons can be used to select the next child node or go back up the tree.")
                    .item("Position and size of the overlay can be freely configured.")
                    .item("The overlay also includes a progress bar showing your progress through the tree.")
                    .item("In triple pulse and 'different level' situations, the correct pulse can be automatically detected.")
                    .item(italic("Dev note: From personal playtesting this is a significant improvement for actively using scan tree guidance while solving, since inputting pulse information is much less disruptive than before. I encourage everyone who found scan trees to annoying to use to give it another go."))
                  )
                  .item("Scan trees that start with a floor disambiguation (e.g. Dorgesh Khaan) will now immediately advance to the correct branch based on the previous clue's solution and whether the scan panel suggests to scan a different level (toggleable).")
                  .item("Added a status overlay to the in-game scan panel similar to the angle overlay for compasses, including some interactive components.", new List()
                    .item(italic("Dev note: Due to time constraints, this overlay has no extensive configuration options yet. Let me know which options you would like to see in a future update."))
                  )
                )
                .paragraph("Interactive overlays are a new piece of Alt1 tech that allows overlays to react to being hovered, right-clicked or having the main hotkey (Alt+1) pressed while being hovered, or even having tooltips. Over time, they will probably be used in more places across Clue Trainer, so let me know if you have any suggestions where they might be useful.")
                .header("General Scan Improvements", "left")
                .row(new List()
                  .item("Spots that trigger a triple pulse no longer have their own button in scan trees. Instead, clicking the triple-line opens a new page with those spots.")
                  .item("You can now click dig spots directly on the map to move the scan tree there.")
                  .item("Triple spots are no longer included in the zoom for scan trees by default.", new List()
                    .item(italic("Dev note: This change only affects new users, and can still be toggled on in the settings. Playtesting showed that with the change before this, seeing all triple spots all the time isn't necessary anymore, so I encourage existing users to also change this setting."))
                  )
                  .item("Standardized colors for scan pulse types to be closer to the ingame visuals.")
                  .item("Added a contrast shadow to the scan range on the map.")
                  .item("Removed spot numbers on scans when not needed to declutter the map.")
                  .item("Fixed bug that caused the map to go to the wrong floor for some scans.")
                  .item("Added paths for a missing part of the fremmenik isles scan.")
                )
                .header("Cluepedia", "left")
                .row(new List()
                  .item("Introduced Cluepedia, Clue Trainer's integrated wiki explaining clue mechanics and Clue Trainer features.", new List()
                    .item("Cluepedia can be accessed via the sidebar menu or from various other places linking directly to specific pages.")
                  )
                  .item("Added a page explaining scans and pulse mechanics.")
                  .item("Added a page explaining scan trees.")
                  .item("Added a page explaining the new interactive overlay to control scan trees.")
                  .item("Added a page explaining the 'different level' mechanic for scans.")
                  .item("Added a page explaining interactive overlays in general.")
                )
                .paragraph("Cluepedia is an ongoing project. Let me know if there are any particular things you would like to see for it.")
                .header("Other", "left")
                .row(new List()
                  .item("A separate path section will now be created for the arrival point if a path ends with a long distance transport.")
                  .item("Compasses will now utilize the previous clue's solution area up to 4 chunks wide and high.")
                  .item("Fixed conflicting zoom for compasses where clue trainer didn't zoom in to the path for the last remaining spot.")
                  .item("Replaced obstructive arrows for far transports in paths with small circles at their arrival location.")
                  .item("Added a minimum similarity for map clues to prevent misreads due to partially loaded maps.")
                  .item("Improved the accuracy of the emote area for various easy clues.")
                  .item("Changed the cursor style on the map to no be a grabbing hand permanently.")
                  .item("Reduced default time allocated to solving sliders down to 0.2 seconds",
                    new List().item("Existing users should consider changing this setting as well. With the new shuffle introduced in december, this is enough and allocating more time barely finds an improvement.")
                  )
                  .item("Some overlays are now automatically hidden when closing or reloading Clue Trainer instead of lingering until they time out.", new List()
                    .item("Not all overlays have been changed to support that yet."))
                )
            }
          }, {
            version: {version: 35, release_date: new Date(Date.parse("2025-02-11"))},
            title: "Collision Fixes",
            render: layout => layout
              .row(new List()
                .item("Updated collision data in the path editor to the latest game update.")
                .item("Replaced a builtin path for an easy clue at Port Khazard that became impossible due to changed collision of the campfire.")
                .item("Added Globetrotter Jacket and Backpack as possible icons for notes in paths.")
                .item("Added interface code for Life Altar teleport.")
              )
          },
          {
            version: {version: 34, release_date: new Date(Date.parse("2025-01-22"))},
            title: "Some Teleport Additions",
            render: layout => {
              layout
                .row(new List()
                  .item("Added the Fremennik sea boots teleport to Relekka Market.")
                  .item("Added the Clan vexillum teleport to Falador.")
                  .item("Added Amulet of nature teleport to hops patch north of McGrubor's wood and the fruit tree patch at Tree Gnome Village")
                  .item("Added the Shattered Worlds teleport.")
                  .item("Added the Soul Wars portal transport.")
                  .item("Added the ladder to and from the Obelisk of Water.")
                  .item("Updated the path for a coordinate step in medium clues in mort myre swamp.")
                )
            }
          },
          {
            version: {version: 33, release_date: new Date(Date.parse("2025-01-13"))},
            title: "Nature Sentinel Key Combinations",
            notification: "Nature's Sentinel keyboard shortcuts have been updated.",
            render: layout => {
              layout
                .row(new List()
                  .item("Updated keyboard code for Nature's sentinel outfit teleports.")
                  .item("Fixed a a few mislabeled teleports.")
                  .item("Fix major performance bug that would do rapid fullscreen captures when manually clicking 'Solve'.")
                )
            }
          }, {
            version: {version: 32, release_date: new Date(Date.parse("2025-01-06"))},
            title: "Data Fixes and Better Method Management",
            render: layout => {
              layout
                .row(new List()
                  .item("Added a note that explains how to enable the Canifis to Mort´ton shortcut to a hard clue step.")
                  .item("Removed impossible compass spots in the Kharazi jungle.")
                  .item("Fixed missing paths for recently relocated tetracompass spots (v31).")
                  .item("Added Portmaster Kags to the teleport dataset")
                  .item("Fixed wrong clue text for the WE IRK OVER NAMESAKE anagram.")
                  .item("Improved styling of buttons across the app.")
                  .item("The method selection dropdown now displays the number of available methods.")
                  .item("Restyled the section control for multi-section paths.")
                  .item("Improved navigation surrounding method packs in the 'Methods' tab.", new List()
                    .item("Method packs are now shown in a single section with improved styling.")
                    .item("Control Buttons were moved to the top.")
                    .item("You can now open method packs like folders to see and manage their included methods.")
                    .item("Added development utilities to simplify editing builtin methods.")
                  )
                )
            }
          }, {
            version: {version: 31, release_date: new Date(Date.parse("2025-01-02"))},
            title: "Small Compass Fixes",
            render: layout => {
              layout
                .row(new List()
                  .item("Added a new builtin triangulation preset for elite clues only using the normal spellbook (Menaphos House Teleport and South Feldip Hills).")
                  .item("Fixed styling issue for triangulation presets with long names.")
                  .item("The compass solver now recognizes clicked teleports when they are part of a previewed path.")
                  .item("Fixed the precise location of 3 tetracompass spots.")
                )
            }
          }, {
            version: {version: 30, release_date: new Date(Date.parse("2024-12-21"))},
            title: "Crash Hotfix",
            silent: true,
            render: layout => {
              layout
                .row(new List()
                  .item("Fixed a bug that caused clue trainer to crash internally when reading certain clue steps.")
                  .item("Fixed another bug that caused another internal crash when reading certain clue steps.")
                )
            }
          }, {
            version: {version: 29, release_date: new Date(Date.parse("2024-12-21"))},
            title: "Further Zoom Fixes and Configuration Options",
            notification: "Check out the new options for zoom behaviour",
            render: layout => {
              layout
                .row(new List()
                  .item("Fixed a bug where parts of a path were hidden behind the UI after zooming in.")
                  .item("Selected path sections will now be remembered even within scan trees.")
                  .item("Added global configuration settings for zoom behaviour in the 'General' section.", new List()
                    .item("Added an option to limit the maximum allowed zoom level.")
                    .item("Added an option to set a minimum size for the area that is zoomed into.")
                    .item("Added an option to include the closest teleport in the zoom when not having a method selected.")
                  )
                  .item("Added configuration options to control what to include in the zoom for scan trees.")
                  .item("Moved interface options from 'General' to the new 'Interface' section.")
                )
            }
          }, {
            version: {version: 28, release_date: new Date(Date.parse("2024-12-16"))},
            title: "Decluttering Path Displays and Zoom Fixes",
            notification: "Check out changes to path rendering and zoom behaviour",
            render: layout => {
              layout
                .row(new List()
                  .item("Fixed various conflicts and inconsistencies with map parts overlaying each other in undesired ways.",
                    new List()
                      .item("For example, the tile grid and collision overlay is now placed below walls."))
                  .item("Fixed zoom to make better use of the available screen real estate while not zooming in incredibly close.")
                  .item("Reduced distracting icons from emote areas and hidey-holes.")
                  .item("Removed redundant dive and run icons across all tiers.")
                  .item("Changed rendering of yellow target indicators for run steps to be polygon based instead of an image marker so it scales better and is less obstructive.")
                  .item("Fixed various wrong far/precise dive indicators.")
                  .item("Changed the color for emote areas to match the purple of Uri and Double Agents.")
                  .item("Starting points for arrows in paths are now outset slightly so their start does not overlap with the arrow tip of the previous step.")
                  .item("Added an alternative method for the Paul Gower master step.")
                  .item("Fixed scan region names hiding teleport icons.")
                  .item("Fixed the image url for an easy map clue.")
                  .item("Removed number displays from compass spots.")
                )
            }
          }, {
            version: {version: 27, release_date: new Date(Date.parse("2024-12-14"))},
            silent: true,
            title: "Crowdsourcing Data Sanitation",
            render: layout => {
              layout
                .row(new List()
                  .item("Added some additional sanitation logic for crowdsourced slider data.")
                )
            }
          }, {
            version: {version: 26, release_date: new Date(Date.parse("2024-12-10"))},
            title: "URL Update",
            silent: true,
            render: layout => {
              layout
                .row(new List()
                  .item("The legacy url <a>https://leridon.github.io/rs3scantrainer</a> has been turned off as announced back in september.")
                  .item("Updated references to the GitHub repository to use the new URL <a>https://github.com/leridon/cluetrainer</a>.", new List().item(
                    "If you have a GitHub account and enjoy Clue Trainer, please head over to the repository and give it a star. "
                  ))
                )
            }
          }, {
            version: {version: 25, release_date: new Date(Date.parse("2024-12-09"))},
            title: "Game Update Fixes",
            render: layout => {
              layout
                .row(new List()
                  .item("Updated the crowdsourcing function to work with the updated slider shuffle.")
                  .item("Updated the teleports of the Natures's Sentinel outfit.")
                  .item("Reduced minimum solve time for sliders to 0.1 seconds down from 0.5 seconds.")
                  .item("Updated collision data after today's game update.", new List()
                    .item("This is not reflected in the visuals yet, as they depend on the runeapps map update."))
                )
                .paragraph("Today's game update changed the shuffle algorithm for slider puzzles, making them significantly faster to solve. Preliminary testing suggests solution lengths in the range between 15 and 40 clicks.")
            }
          }, {
            version: {version: 24, release_date: new Date(Date.parse("2024-12-05"))},
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
            version: {version: 23, release_date: new Date(Date.parse("2024-11-26"))},
            title: "Seal Slider Fix",
            render: layout => {
              layout
                .row(new List()
                  .item("Enabled support for the seal slider image used to free Mephisto in the Infernal Source.")
                )
            }
          }, {
            version: {version: 22, release_date: new Date(Date.parse("2024-11-25"))},
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
            version: {version: 21, release_date: new Date(Date.parse("2024-11-25"))},
            silent: true,
            title: "Fixing the Bugfix",
            render: layout => {
              layout
                .row(new List()
                  .item("Added more error resilience to the minimap zoom detection, which caused the minimap overlay to not appear at all.")
                )
            }
          }, {
            version: {version: 20, release_date: new Date(Date.parse("2024-11-25"))},
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
            version: {version: 19, release_date: new Date(Date.parse("2024-11-17"))},
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
            version: {version: 18, release_date: new Date(Date.parse("2024-11-17"))},
            title: "Clue Reader Bugfix",
            render: layout => {
              layout
                .row(new List()
                  .item("(Maybe) Fixed a newly introduced bug that prevented scans from being read.")
                  .item("Added a notification when the clue reader is not fully initialized when trying to solve a clue.")
                )
            }
          }, {
            version: {version: 17, release_date: new Date(Date.parse("2024-11-16"))},
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
            version: {version: 16, release_date: new Date(Date.parse("2024-10-10"))},
            silent: true,
            title: "Compass Overlay Fix",
            render: layout => {
              layout
                .row(new List()
                  .item("Fixed a timing issue that could cause the compass overlay to persist after the compass already ended.")
                )
            }
          }, {
            version: {version: 15, release_date: new Date(Date.parse("2024-10-10"))},
            silent: true,
            title: "Solving Bugfix",
            render: layout => {
              layout
                .row(new List()
                  .item("Fixed a bug that caused parts of the solving interface to not appear when reading a scan.")
                )
            }
          }, {
            version: {version: 14, release_date: new Date(Date.parse("2024-10-08"))},
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
            version: {version: 13, release_date: new Date(Date.parse("2024-10-03"))},
            silent: true,
            title: "Lockbox Hotfix",
            render: layout => {
              layout
                .row(new List()
                  .item("Changed the desync detection for lockboxes for a much more stable and reliable implementation.")
                )
            }
          }, {
            version: {version: 12, release_date: new Date(Date.parse("2024-10-03"))},
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
            version: {version: 11, release_date: new Date(Date.parse("2024-09-22"))},
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
            version: {version: 10, release_date: new Date(Date.parse("2024-09-20"))},
            silent: true,
            title: "Timing Bugfix",
            render: layout => {
              layout.row(new List()
                  .item("Fixed a rare timing bug where a completed puzzle could abort the following clue. This was noticeable for compasses following a celtic knot.")
                  .item("Reduced the size of log files.")
                )
                .paragraph("This is a bit of a speculative fix, because the source of the reported issue is not 100% confirmed.")
            }
          }, {
            version: {version: 9, release_date: new Date(Date.parse("2024-09-18"))},
            title: "Bugfixes",
            render: layout => {
              layout.row(new List()
                .item("Fixed a minor bug that caused an exception when outside of Alt 1.")
                .item("Fixed a bug that caused teleport icons on the map to not update on changes to the settings, requiring a reload.")
              )
            }
          }, {
            version: {version: 8, release_date: new Date(Date.parse("2024-09-09"))},
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
            version: {version: 7, release_date: new Date(Date.parse("2024-08-11"))},
            title: "Transport Fixes and Permission Checking",
            render: layout => {
              layout.row(new List()
                .item("Fixed issues with various transports missing in the path editor and many actions being named 'Unnamed Action'.")
                .item("Clue Trainer now checks if all required permissions are granted on startup and opens and explanation how to grant them if they are not.")
              )
            }
          }, {
            version: {version: 6, release_date: new Date(Date.parse("2024-07-14"))},
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
            version: {version: 5, release_date: new Date(Date.parse("2024-07-12"))},
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
            version: {version: 4, release_date: new Date(Date.parse("2024-07-11"))},
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
            version: {version: 3, release_date: new Date(Date.parse("2024-07-10"))},
            title: "New Method",
            render: layout => {
              layout.row(new List()
                .item("Added an alternative route without HSR for the medium clue in the terrorbird pen.")
              )
            }
          },
          {
            version: {version: 2, release_date: new Date(Date.parse("2024-07-09"))},
            title: "Slider Bugfix",
            render: layout => {
              layout.row(new List()
                .item("Fixed a bug with error recovery on sliders that caused impossible moves to be displayed.")
              )
            }
          },
          {
            version: {version: 1, release_date: new Date(Date.parse("2024-07-09"))},
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
            version: {version: 0, release_date: new Date(Date.parse("2024-06-28"))},
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
            version: {version: -1, release_date: new Date(Date.parse("2024-06-25"))},

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
            version: {version: -2, release_date: new Date(Date.parse("2024-06-18"))},
            title: "Slider Bugfix",
            render: layout => {
              layout.row(new List()
                .item("Fixed an issue with the slider reader that caused misreads for some sliders, particularly the tree motive on low graphic settings.")
              )
            }
          },
          {
            version: {version: -3, release_date: new Date(Date.parse("2024-06-16"))},

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
            version: {version: -4, release_date: new Date(Date.parse("2024-06-14"))},
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
            version: {version: -5, release_date: new Date(Date.parse("2024-06-11"))},
            title: "Bugfixes",
            render: layout => {
              layout.row(new List()
                .item("Switched to a custom implementation of modals (settings, puzzles, etc.). This lacks some of the fancy animations, but crucially also lacks the bugs causing the grayed overlay rendering clue trainer unusable.")
                .item("Fixed a long standing bug with base64 exports/imports of method packs and paths.")
              )
            }
          },
          {
            version: {version: -6, release_date: new Date(Date.parse("2024-06-10"))},
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
            version: {version: -7, release_date: new Date(Date.parse("2024-06-06"))},
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
            version: {version: -8, release_date: new Date(Date.parse("2024-06-05"))},
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
            version: {version: -9, release_date: new Date(Date.parse("2024-06-02"))},
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
            version: {version: -10, release_date: new Date(Date.parse("2024-06-01"))},
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

          })
      }
    ).compile()

  export class Modal extends NisModal {
    constructor(private log: ChangeLog) {
      super();

      this.setTitle(`Changelog (${Version.asString(log.latest_patch.version)})`)
    }

    render() {
      super.render();

      const layout = new Properties().appendTo(this.body)

      Intl.DateTimeFormat("de-de", {
        dateStyle: "medium",
        timeStyle: "short"
      })

      /*layout.row(
        "<div style='text-align: center'><a href='https://ko-fi.com/I2I4XY829' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a></div>"
      )*/

      layout.row(
        c("<div style='text-align: center; margin-right: 5px'><a href='https://ko-fi.com/I2I4XY829' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a></div>")
      )

      layout.row(
        div(
          'If you enjoy Clue Trainer, please consider supporting continuous development at <a href="https://ko-fi.com/I2I4XY829" target="_blank">Ko-fi</a>.'
        )
      )

      // layout.paragraph('If you enjoy Clue Trainer, please consider supporting continuous development of Clue Trainer at <a href="https://ko-fi.com/I2I4XY829" target="_blank"><img class="ctr-clickable" height="12px" src="/assets/icons/kofi.webp"> KoFi</a>.')

      layout.paragraph('You can also join the <a href="https://discord.gg/cluechasers" target="_blank"><img src="/assets/icons/cluechasers.png" height="12px">Clue Chasers discord</a> to leave praise and criticism, report issues, request features, get support or just come by and say hi in the <a href="https://discord.com/channels/332595657363685377/1103737270114209825" target="_blank">#clue-trainer</a> channel.')

      layout.divider()

      log.entries.forEach(entry => {
        const date = Version.date(entry.version)

        layout.header(c().text(`${date.toLocaleDateString("en-gb")} (${Version.asString(entry.version)}) - ${entry.title}`))

        entry.render(layout)

        layout.divider()
      })

      layout.paragraph("No historic patch notes available beyond this point in time.")
    }
  }
}