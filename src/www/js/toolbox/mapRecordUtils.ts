type Mapper<InputType, OutputType> = (value: InputType, key: string) => OutputType;

export function mapRecord<InputType, OutputType, T extends Record<string, InputType>>(
  input: T,
  convert: Mapper<InputType, OutputType>
): { [K in keyof T]: OutputType } {
  const out = {} as { [K in keyof T]: OutputType };
  for (const k in input) {
    // k is a string, narrow it to keyof T for assignment
    const key = k as keyof T;
    out[key] = convert(input[key], k);
  }
  return out;
}
