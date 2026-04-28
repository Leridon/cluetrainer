import {storage} from "../../lib/util/storage";
import {Menu, MenuEntry} from "../ui/widgets/ContextMenu";
import {PathBuilder} from "./PathBuilder";
import {ConfirmationModal} from "../ui/widgets/modals/ConfirmationModal";
import {FormModal} from "../../lib/ui/controls/FormModal";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import Properties from "../ui/widgets/Properties";
import TextField from "../../lib/ui/controls/TextField";
import {Checkbox} from "../../lib/ui/controls/Checkbox";

export class BookmarkStorage {
  temporary_bookmarks: BookmarkStorage.Bookmark[] = []

  create(bookmark: BookmarkStorage.Bookmark) {
    switch (bookmark.type) {
      case "persistent":
        BookmarkStorage.persistance.map(v => {
          v.push(bookmark)
        })
        break
      case "temporary":
        this.temporary_bookmarks.push(bookmark)
        break
    }
  }

  delete(bookmark: BookmarkStorage.Bookmark) {
    switch (bookmark.type) {
      case "persistent":
        BookmarkStorage.persistance.map(v => {
          v.splice(v.indexOf(bookmark), 1)
        })
        break
      case "temporary":
        this.temporary_bookmarks.splice(this.temporary_bookmarks.indexOf(bookmark), 1)
        break
    }
  }

  getAll(): BookmarkStorage.Bookmark[] {
    return [].concat(BookmarkStorage.persistance.get(), this.temporary_bookmarks)
  }
}

export namespace BookmarkStorage {
  export const persistance = new storage.Variable<BookmarkStorage.Bookmark[]>("patheditor/bookmarks", () => [])

  export type Bookmark = {
    name: string,
    value: PathBuilder.SavedState,
    type: "persistent" | "temporary"
  }

  class CreateBookmarkModal extends FormModal<Bookmark> {

    private bookmark: Bookmark

    constructor(private start_name: string, private value: PathBuilder.SavedState) {
      super({
        size: "small"
      });

      this.title.set("Create Bookmark")

      this.bookmark = {
        name: start_name,
        value: value,
        type: "temporary"
      }
    }

    render() {
      super.render()

      const props = new Properties().appendTo(this.body)

      props.named("Bookmark name", new TextField()
        .setValue(this.start_name)
        .setPlaceholder("Name...")
        .onCommit(v => this.bookmark.name = v)
      )

      props.row(new Checkbox("Save for future use?")
        .setValue(this.bookmark.type == "persistent")
        .onCommit(v => this.bookmark.type = v ? "persistent" : "temporary")
      )
    }

    getButtons(): BigNisButton[] {
      return [
        new BigNisButton("Cancel", "cancel")
          .onClick(() => this.cancel()),
        new BigNisButton("Save", "confirm")
          .onClick(() => this.confirm(this.bookmark)),
      ]
    }

    protected getValueForCancel(): BookmarkStorage.Bookmark {
      return null
    }
  }

  export function getContextMenu(builder: PathBuilder, storage: BookmarkStorage): Menu {
    const forBookmarks = storage.getAll()
      .map<MenuEntry>(bookmark => {

        const submenu: MenuEntry.SubMenu = {
          text: bookmark.name,
          type: "submenu",
          children: []
        }

        submenu.children.push(
          {
            type: "basic",
            text: "Load",
            handler: () => {
              builder.set(
                bookmark.value.path,
                false,
                bookmark.value.cursor
              )

            }
          })

        submenu.children.push(
          {
            type: "basic",
            text: "Insert",
            handler: () => {
              builder.add(...bookmark.value.path)
            }
          }
        )

        if (
          bookmark.type == "temporary") {
          submenu.children.push({
            type: "basic",
            text: "Make persistent",
            handler: () => {
              storage.delete(bookmark)

              bookmark.type = "persistent"

              storage.create(bookmark)
            }
          })
        }

        submenu.children.push({
          type: "basic",
          text: "Delete",
          handler: async () => {
            const really = bookmark.type == "temporary" || (await new ConfirmationModal({
              options: [
                {text: "Cancel", kind: "cancel", value: false},
                {text: "Delete", kind: "cancel", value: true},
              ],
              title: "Remove Bookmark?",
              body: "Do you really want to remove this persistent path bookmark? There is no way to undo this and you will have to recreate it manually."
            }).do())

            if (really) storage.delete(bookmark)
          }
        })

        return submenu
      })

    return {
      type: "submenu",
      text: "",
      children: [...forBookmarks,
        {
          type: "basic",
          text: "Create Bookmark",
          handler: async () => {

            function findNextFreeName(n: number): string {
              const name = `Bookmark ${n}`

              if (storage.getAll().some(b => b.name == name)) return findNextFreeName(n + 1)

              return name
            }

            const name = findNextFreeName(1)

            const bookmark = await new CreateBookmarkModal(name, builder.copyState()).do()

            if (bookmark) {
              storage.create(bookmark)
            }
          }
        }]
    }
  }
}
