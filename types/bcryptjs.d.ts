declare module "bcryptjs" {
  export function genSalt(rounds?: number): Promise<string>;
  export function hash(data: string, salt: string): Promise<string>;
}
