/* eslint-disable no-console */
/* eslint-disable functional/no-let */
/* eslint-disable functional/prefer-readonly-type */
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { CallbackFunction } from "./definitions";

export class Router {
  private routes: Map<RegExp, CallbackFunction>;

  constructor() {
    this.routes = new Map<RegExp, CallbackFunction>();
    console.debug("Generated Router object. Registered 0 routes");
  }

  public setRoute(
    httpMethod: string,
    regex: string,
    callback: CallbackFunction
  ): Router {
    let unescapedRegex = regex.startsWith("/") ? regex.slice(1, 0) : regex;
    if (unescapedRegex.endsWith("/")) {
      unescapedRegex = unescapedRegex.slice(0, -1);
    }
    unescapedRegex = unescapedRegex.replace(
      /[\\/]{0,1}({[^\\/]+})/g,
      "\\/([^\\/]+)"
    );
    const generatedRegex = `^${httpMethod} [\\/]{0,1}${unescapedRegex}[\\/]{0,1}$`;
    const regExp = new RegExp(generatedRegex, "g");
    this.routes.set(regExp, callback);
    console.debug(
      `Registered route [${generatedRegex}]. Defined ${this.routes.size} routes.`
    );
    return this;
  }

  public async callRoute(
    key: string,
    event: APIGatewayEvent
  ): Promise<APIGatewayProxyResult> {
    console.debug(
      `Trying to invoke [${key}] route. Analyzing ${this.routes.size} elements.`
    );
    for (const [routeRegex, callback] of this.routes.entries()) {
      const routePathParams = routeRegex.exec(key);
      // eslint-disable-next-line functional/immutable-data
      routeRegex.lastIndex = 0; // resetting regex index
      if (routePathParams !== null) {
        console.debug("Route found. Invoking related function...");
        return await callback(event, routePathParams);
      }
    }
    return {
      body: JSON.stringify(
        { message: `No resource found at path [${key}]!` },
        null,
        "\t"
      ),
      headers: { "Content-Type": "application/json" },
      statusCode: 404,
    };
  }
}
