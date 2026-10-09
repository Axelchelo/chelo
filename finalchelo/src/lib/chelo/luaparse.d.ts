declare module "luaparse" {
  export function parse(
    source: string,
    options?: {
      luaVersion?: string;
      locations?: boolean;
      ranges?: boolean;
      scope?: boolean;
      comments?: boolean;
    },
  ): {
    type: string;
    range?: [number, number];
    body?: unknown[];
    [key: string]: unknown;
  };
}
