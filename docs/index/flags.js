export const flag = (countryCode) => {
  if (!countryCode) {
    return undefined;
  }
  const letters = countryCode.toLowerCase().replace(/[^a-z]/g, "");
  let flag = "";
  let indicatorA = 0x1f1e6;
  let letterA = "a".codePointAt(0);
  for (const letter of letters) {
    flag += String.fromCodePoint(letter.codePointAt(0) - letterA + indicatorA);
  }
  return flag;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbImluZGV4L2ZsYWdzLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFvQixFQUFrQixFQUFFO0lBQzNELElBQUksQ0FBQyxXQUFXLEVBQUU7UUFDaEIsT0FBTyxTQUFTLENBQUM7S0FDbEI7SUFFRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7SUFDZCxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUM7SUFDekIsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUUsQ0FBQztJQUNsQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtRQUM1QixJQUFJLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxHQUFHLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQztLQUM3RTtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGZsYWcgPSAoY291bnRyeUNvZGU/OiBzdHJpbmcpOiBKU1guUmVuZGVyYWJsZSA9PiB7XG4gIGlmICghY291bnRyeUNvZGUpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgbGV0dGVycyA9IGNvdW50cnlDb2RlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXpdL2csIFwiXCIpO1xuICBsZXQgZmxhZyA9IFwiXCI7XG4gIGxldCBpbmRpY2F0b3JBID0gMHgxZjFlNjtcbiAgbGV0IGxldHRlckEgPSBcImFcIi5jb2RlUG9pbnRBdCgwKSE7XG4gIGZvciAoY29uc3QgbGV0dGVyIG9mIGxldHRlcnMpIHtcbiAgICBmbGFnICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KGxldHRlci5jb2RlUG9pbnRBdCgwKSEgLSBsZXR0ZXJBICsgaW5kaWNhdG9yQSk7XG4gIH1cbiAgcmV0dXJuIGZsYWc7XG59O1xuIl19
