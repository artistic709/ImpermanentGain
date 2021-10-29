export default function getRevertError(reason: string): string {
  return `VM Exception while processing transaction: reverted with reason string '${reason}'`;
}
