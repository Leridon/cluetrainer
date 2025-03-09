import {NisModal} from "../../lib/ui/NisModal";
import Properties from "../ui/widgets/Properties";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {C} from "../../lib/ui/constructors";
import img = C.img;
import {Notification} from "../ui/NotificationBar";
import notification = Notification.notification;

export class PermissionChecker extends NisModal {
  constructor() {
    super({disable_close_button: true, fixed: true});

    this.title.set("Missing Permissions")
  }

  render() {
    super.render();

    const props = new Properties().appendTo(this.body)

    props.paragraph("Clue Trainer is missing permissions that are essential for it to function. Please grant the necessary permissions and then check again by clicking the button on the bottom of this modal.")

    props.header("How to set permissions")

    props.paragraph("Open Clue Trainer settings by clicking the small wrench on the top left, next to the buttons to minimize or close the window.")

    props.row(img("/media/how_to_set_permissions_1.png"))

    props.paragraph("Make sure all permissions are checked.")

    props.row(img("/media/how_to_set_permissions_2.png"))

    props.paragraph("Click 'Check' below to check if permissions have correctly been set.")
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Ignore", "cancel")
        .onClick(() => {
          notification("Please be aware that Clue Trainer will not work without granting the permissions.", "error").show()
          this.remove()
        }),
      new BigNisButton("Check", "confirm")
        .onClick(() => {
          if (!alt1) this.remove()
          else {
            if (alt1.permissionPixel && alt1.permissionOverlay && alt1.permissionGameState) {
              notification("Success! Permissions are fine now", "information").show()
              this.remove()
            } else {
              notification("Clue Trainer is still missing permissions.", "error").show()
            }
          }
        })
    ]
  }
}

export namespace PermissionChecker {
  export function arePermissionsFine(): boolean {
    return alt1.permissionPixel && alt1.permissionOverlay && alt1.permissionGameState
  }

  export function check() {
    if (alt1.permissionInstalled && !arePermissionsFine()) new PermissionChecker().show()
  }
}