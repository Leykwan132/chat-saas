export function getCommentAutomationValidationErrors(name: string, privateMessage: string) {
  return {
    name: name.trim().length === 0,
    privateMessage: privateMessage.trim().length === 0,
  };
}
