/// Generates a local key that orders SKUs by type, truncated app ID, and
/// truncated SKU ID, and includes a potentially-truncated copy of the SKU's
/// name. The ordering should be adequate for tree indexing if we ever use it,
/// while potentially providing some minimal human-readability.
export const localKey = (sku) => {
  const length = 32;
  const maxNameLength = 23;
  const typeTag =
    { game: "g", addon: "o", bundle: "x", subscription: "c" }[sku.type] ??
    `?${sku.type}?`;
  const idsPrefix = sku.app.slice(0, 6) + sku.sku.slice(0, 2);
  const idsRest = sku.app.slice(6) + sku.sku.slice(2);
  let name = (sku.name + sku.internalSlug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (name.length > maxNameLength) {
    const letterCounts = {};
    for (const letter of name) {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }
    while (name.length > maxNameLength) {
      const mostFrequentCount = Math.max(...Object.values(letterCounts));
      const mostFrequent = Object.entries(letterCounts)
        .filter(([_letter, count]) => count == mostFrequentCount)
        .map(([letter, _count]) => letter);
      for (let i = name.length - 1; i >= 0; i -= 1) {
        const letter = name[i];
        if (mostFrequent.includes(letter)) {
          name = name.slice(0, i) + name.slice(i + 1);
          letterCounts[letter] -= 1;
          break;
        }
      }
    }
  }
  return (typeTag + idsPrefix + name + idsRest).slice(0, length);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwta2V5LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJpbmRleC9kYXRhL2xvY2FsLWtleS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSx5RUFBeUU7QUFDekUsNEVBQTRFO0FBQzVFLDhFQUE4RTtBQUM5RSwrREFBK0Q7QUFDL0QsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBb0IsRUFBRSxFQUFFO0lBQy9DLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDekIsTUFBTSxPQUFPLEdBQ1YsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFVLENBQ2hFLEdBQUcsQ0FBQyxJQUFJLENBQ1QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQztJQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBELElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDO1NBQ3JDLFdBQVcsRUFBRTtTQUNiLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFOUIsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLGFBQWEsRUFBRTtRQUMvQixNQUFNLFlBQVksR0FBMkIsRUFBRSxDQUFDO1FBQ2hELEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ3pCLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEQ7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxFQUFFO1lBQ2xDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztpQkFDOUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssSUFBSSxpQkFBaUIsQ0FBQztpQkFDeEQsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDakMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxQixNQUFNO2lCQUNQO2FBQ0Y7U0FDRjtLQUNGO0lBRUQsT0FBTyxDQUFDLE9BQU8sR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tbW9uU2t1LCBTa3UgfSBmcm9tIFwiLi9tb2RlbHMuanNcIjtcblxuLy8vIEdlbmVyYXRlcyBhIGxvY2FsIGtleSB0aGF0IG9yZGVycyBTS1VzIGJ5IHR5cGUsIHRydW5jYXRlZCBhcHAgSUQsIGFuZFxuLy8vIHRydW5jYXRlZCBTS1UgSUQsIGFuZCBpbmNsdWRlcyBhIHBvdGVudGlhbGx5LXRydW5jYXRlZCBjb3B5IG9mIHRoZSBTS1Unc1xuLy8vIG5hbWUuIFRoZSBvcmRlcmluZyBzaG91bGQgYmUgYWRlcXVhdGUgZm9yIHRyZWUgaW5kZXhpbmcgaWYgd2UgZXZlciB1c2UgaXQsXG4vLy8gd2hpbGUgcG90ZW50aWFsbHkgcHJvdmlkaW5nIHNvbWUgbWluaW1hbCBodW1hbi1yZWFkYWJpbGl0eS5cbmV4cG9ydCBjb25zdCBsb2NhbEtleSA9IChza3U6IFNrdSB8IENvbW1vblNrdSkgPT4ge1xuICBjb25zdCBsZW5ndGggPSAzMjtcbiAgY29uc3QgbWF4TmFtZUxlbmd0aCA9IDIzO1xuICBjb25zdCB0eXBlVGFnID1cbiAgICAoeyBnYW1lOiBcImdcIiwgYWRkb246IFwib1wiLCBidW5kbGU6IFwieFwiLCBzdWJzY3JpcHRpb246IFwiY1wiIH0gYXMgYW55KVtcbiAgICAgIHNrdS50eXBlXG4gICAgXSA/PyBgPyR7c2t1LnR5cGV9P2A7XG4gIGNvbnN0IGlkc1ByZWZpeCA9IHNrdS5hcHAuc2xpY2UoMCwgNikgKyBza3Uuc2t1LnNsaWNlKDAsIDIpO1xuICBjb25zdCBpZHNSZXN0ID0gc2t1LmFwcC5zbGljZSg2KSArIHNrdS5za3Uuc2xpY2UoMik7XG5cbiAgbGV0IG5hbWUgPSAoc2t1Lm5hbWUgKyBza3UuaW50ZXJuYWxTbHVnKVxuICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgLnJlcGxhY2UoL1teYS16MC05XSsvZywgXCJcIik7XG5cbiAgaWYgKG5hbWUubGVuZ3RoID4gbWF4TmFtZUxlbmd0aCkge1xuICAgIGNvbnN0IGxldHRlckNvdW50czogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgIGZvciAoY29uc3QgbGV0dGVyIG9mIG5hbWUpIHtcbiAgICAgIGxldHRlckNvdW50c1tsZXR0ZXJdID0gKGxldHRlckNvdW50c1tsZXR0ZXJdIHx8IDApICsgMTtcbiAgICB9XG4gICAgd2hpbGUgKG5hbWUubGVuZ3RoID4gbWF4TmFtZUxlbmd0aCkge1xuICAgICAgY29uc3QgbW9zdEZyZXF1ZW50Q291bnQgPSBNYXRoLm1heCguLi5PYmplY3QudmFsdWVzKGxldHRlckNvdW50cykpO1xuICAgICAgY29uc3QgbW9zdEZyZXF1ZW50ID0gT2JqZWN0LmVudHJpZXMobGV0dGVyQ291bnRzKVxuICAgICAgICAuZmlsdGVyKChbX2xldHRlciwgY291bnRdKSA9PiBjb3VudCA9PSBtb3N0RnJlcXVlbnRDb3VudClcbiAgICAgICAgLm1hcCgoW2xldHRlciwgX2NvdW50XSkgPT4gbGV0dGVyKTtcbiAgICAgIGZvciAobGV0IGkgPSBuYW1lLmxlbmd0aCAtIDE7IGkgPj0gMDsgaSAtPSAxKSB7XG4gICAgICAgIGNvbnN0IGxldHRlciA9IG5hbWVbaV07XG4gICAgICAgIGlmIChtb3N0RnJlcXVlbnQuaW5jbHVkZXMobGV0dGVyKSkge1xuICAgICAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDAsIGkpICsgbmFtZS5zbGljZShpICsgMSk7XG4gICAgICAgICAgbGV0dGVyQ291bnRzW2xldHRlcl0gLT0gMTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAodHlwZVRhZyArIGlkc1ByZWZpeCArIG5hbWUgKyBpZHNSZXN0KS5zbGljZSgwLCBsZW5ndGgpO1xufTtcbiJdfQ==