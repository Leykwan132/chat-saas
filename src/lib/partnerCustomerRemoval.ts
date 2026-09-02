export async function completePartnerCustomerRemoval(
  removeCustomer: () => Promise<null>,
): Promise<boolean> {
  await removeCustomer();
  return true;
}
