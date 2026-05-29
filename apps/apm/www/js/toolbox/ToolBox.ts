export function randomAlphaString(length: number): string {
  return Math.random().toString(36).substring(2, length + 2);
}


export class MyClass {
  private readonly t:string;
  constructor(t :string) {
    this.t = t;
  }

  public getT():string {
    return this.t;
  }
}