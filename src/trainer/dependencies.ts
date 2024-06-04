import {type Application} from "./application";

export default class Dependencies {
  app: Application = null
  //template_resolver: Observable<TemplateResolver> = observe(null)

  private static _instance: Dependencies = null

  static instance(): Dependencies {
    if (!Dependencies._instance) Dependencies._instance = new Dependencies()

    return Dependencies._instance
  }
}

export function deps(): Dependencies {
  return Dependencies.instance()
}