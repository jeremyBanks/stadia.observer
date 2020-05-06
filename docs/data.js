export const internalKey = (sku) => {
    const length = 32;
    const maxNameLength = 23;
    const typeTag = { game: "g", addon: "o", bundle: "x", subscription: "c" }[sku.type] ?? `?${sku.type}?`;
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
export class CommonSku {
    constructor(app, sku, type, name, internalSlug, description) {
        this.app = app;
        this.sku = sku;
        this.type = type;
        this.name = name;
        this.internalSlug = internalSlug;
        this.description = description;
        this.localKey = internalKey(this);
    }
}
export class Game extends CommonSku {
    constructor(app, sku, type = "game", name, internalSlug, description) {
        super(app, sku, type, name, internalSlug, description);
        this.type = type;
        this.internalSlug = internalSlug;
        this.description = description;
    }
}
export class AddOn extends CommonSku {
    constructor(app, sku, type = "addon", name, internalSlug, description) {
        super(app, sku, type, name, internalSlug, description);
        this.type = type;
        this.internalSlug = internalSlug;
        this.description = description;
    }
}
export class Bundle extends CommonSku {
    constructor(app, sku, type = "bundle", name, internalSlug, description, skus) {
        super(app, sku, type, name, internalSlug, description);
        this.type = type;
        this.internalSlug = internalSlug;
        this.description = description;
        this.skus = skus;
    }
}
export class Subscription extends CommonSku {
    constructor(app, sku, type = "subscription", name, internalSlug, description, skus) {
        super(app, sku, type, name, internalSlug, description);
        this.type = type;
        this.internalSlug = internalSlug;
        this.description = description;
        this.skus = skus;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsiZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFvQixFQUFFLEVBQUU7SUFDbEQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztJQUN6QixNQUFNLE9BQU8sR0FDVixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQVUsQ0FDaEUsR0FBRyxDQUFDLElBQUksQ0FDVCxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDO0lBQ3ZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFcEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUM7U0FDckMsV0FBVyxFQUFFO1NBQ2IsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUU5QixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxFQUFFO1FBQy9CLE1BQU0sWUFBWSxHQUEyQixFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDekIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FB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Q0YsT0FBTyxRQUFpQixFQUNqQyxJQUFZLEVBQ0gsWUFBb0IsRUFDcEIsV0FBbUIsRUFDbkIsSUFBbUI7UUFFNUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFOOUMsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFFeEIsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsU0FBSSxHQUFKLElBQUksQ0FBZTtJQUc5QixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sWUFBYSxTQUFRLFNBQVM7SUFDekMsWUFDRSxHQUFXLEVBQ1gsR0FBVyxFQUNGLE9BQU8sY0FBdUIsRUFDdkMsSUFBWSxFQUNILFlBQW9CLEVBQ3BCLFdBQW1CLEVBQ25CLElBQW1CO1FBRTVCLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBTjlDLFNBQUksR0FBSixJQUFJLENBQTBCO1FBRTlCLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFNBQUksR0FBSixJQUFJLENBQWU7SUFHOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IHR5cGUgU2t1ID0gR2FtZSB8IEFkZE9uIHwgQnVuZGxlIHwgU3Vic2NyaXB0aW9uO1xuXG5leHBvcnQgY29uc3QgaW50ZXJuYWxLZXkgPSAoc2t1OiBTa3UgfCBDb21tb25Ta3UpID0+IHtcbiAgY29uc3QgbGVuZ3RoID0gMzI7XG4gIGNvbnN0IG1heE5hbWVMZW5ndGggPSAyMztcbiAgY29uc3QgdHlwZVRhZyA9XG4gICAgKHsgZ2FtZTogXCJnXCIsIGFkZG9uOiBcIm9cIiwgYnVuZGxlOiBcInhcIiwgc3Vic2NyaXB0aW9uOiBcImNcIiB9IGFzIGFueSlbXG4gICAgICBza3UudHlwZVxuICAgIF0gPz8gYD8ke3NrdS50eXBlfT9gO1xuICBjb25zdCBpZHNQcmVmaXggPSBza3UuYXBwLnNsaWNlKDAsIDYpICsgc2t1LnNrdS5zbGljZSgwLCAyKTtcbiAgY29uc3QgaWRzUmVzdCA9IHNrdS5hcHAuc2xpY2UoNikgKyBza3Uuc2t1LnNsaWNlKDIpO1xuXG4gIGxldCBuYW1lID0gKHNrdS5uYW1lICsgc2t1LmludGVybmFsU2x1ZylcbiAgICAudG9Mb3dlckNhc2UoKVxuICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csIFwiXCIpO1xuXG4gIGlmIChuYW1lLmxlbmd0aCA+IG1heE5hbWVMZW5ndGgpIHtcbiAgICBjb25zdCBsZXR0ZXJDb3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGxldHRlciBvZiBuYW1lKSB7XG4gICAgICBsZXR0ZXJDb3VudHNbbGV0dGVyXSA9IChsZXR0ZXJDb3VudHNbbGV0dGVyXSB8fCAwKSArIDE7XG4gICAgfVxuICAgIHdoaWxlIChuYW1lLmxlbmd0aCA+IG1heE5hbWVMZW5ndGgpIHtcbiAgICAgIGNvbnN0IG1vc3RGcmVxdWVudENvdW50ID0gTWF0aC5tYXgoLi4uT2JqZWN0LnZhbHVlcyhsZXR0ZXJDb3VudHMpKTtcbiAgICAgIGNvbnN0IG1vc3RGcmVxdWVudCA9IE9iamVjdC5lbnRyaWVzKGxldHRlckNvdW50cylcbiAgICAgICAgLmZpbHRlcigoW19sZXR0ZXIsIGNvdW50XSkgPT4gY291bnQgPT0gbW9zdEZyZXF1ZW50Q291bnQpXG4gICAgICAgIC5tYXAoKFtsZXR0ZXIsIF9jb3VudF0pID0+IGxldHRlcik7XG4gICAgICBmb3IgKGxldCBpID0gbmFtZS5sZW5ndGggLSAxOyBpID49IDA7IGkgLT0gMSkge1xuICAgICAgICBjb25zdCBsZXR0ZXIgPSBuYW1lW2ldO1xuICAgICAgICBpZiAobW9zdEZyZXF1ZW50LmluY2x1ZGVzKGxldHRlcikpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zbGljZSgwLCBpKSArIG5hbWUuc2xpY2UoaSArIDEpO1xuICAgICAgICAgIGxldHRlckNvdW50c1tsZXR0ZXJdIC09IDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gKHR5cGVUYWcgKyBpZHNQcmVmaXggKyBuYW1lICsgaWRzUmVzdCkuc2xpY2UoMCwgbGVuZ3RoKTtcbn07XG5cbmV4cG9ydCBjbGFzcyBDb21tb25Ta3Uge1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSBhcHA6IHN0cmluZyxcbiAgICByZWFkb25seSBza3U6IHN0cmluZyxcbiAgICByZWFkb25seSB0eXBlOiBcImdhbWVcIiB8IFwiYWRkb25cIiB8IFwiYnVuZGxlXCIgfCBcInN1YnNjcmlwdGlvblwiLFxuICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICByZWFkb25seSBpbnRlcm5hbFNsdWc6IHN0cmluZyxcbiAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nXG4gICkge1xuICAgIHRoaXMubG9jYWxLZXkgPSBpbnRlcm5hbEtleSh0aGlzKTtcbiAgfVxuICByZWFkb25seSBsb2NhbEtleTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgR2FtZSBleHRlbmRzIENvbW1vblNrdSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogc3RyaW5nLFxuICAgIHNrdTogc3RyaW5nLFxuICAgIHJlYWRvbmx5IHR5cGUgPSBcImdhbWVcIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgaW50ZXJuYWxTbHVnOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZ1xuICApIHtcbiAgICBzdXBlcihhcHAsIHNrdSwgdHlwZSwgbmFtZSwgaW50ZXJuYWxTbHVnLCBkZXNjcmlwdGlvbik7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFkZE9uIGV4dGVuZHMgQ29tbW9uU2t1IHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBzdHJpbmcsXG4gICAgc2t1OiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgdHlwZSA9IFwiYWRkb25cIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgaW50ZXJuYWxTbHVnOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZ1xuICApIHtcbiAgICBzdXBlcihhcHAsIHNrdSwgdHlwZSwgbmFtZSwgaW50ZXJuYWxTbHVnLCBkZXNjcmlwdGlvbik7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJ1bmRsZSBleHRlbmRzIENvbW1vblNrdSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogc3RyaW5nLFxuICAgIHNrdTogc3RyaW5nLFxuICAgIHJlYWRvbmx5IHR5cGUgPSBcImJ1bmRsZVwiIGFzIGNvbnN0LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICByZWFkb25seSBpbnRlcm5hbFNsdWc6IHN0cmluZyxcbiAgICByZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICAgIHJlYWRvbmx5IHNrdXM6IEFycmF5PHN0cmluZz5cbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBza3UsIHR5cGUsIG5hbWUsIGludGVybmFsU2x1ZywgZGVzY3JpcHRpb24pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdWJzY3JpcHRpb24gZXh0ZW5kcyBDb21tb25Ta3Uge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IHN0cmluZyxcbiAgICBza3U6IHN0cmluZyxcbiAgICByZWFkb25seSB0eXBlID0gXCJzdWJzY3JpcHRpb25cIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgaW50ZXJuYWxTbHVnOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICByZWFkb25seSBza3VzOiBBcnJheTxzdHJpbmc+XG4gICkge1xuICAgIHN1cGVyKGFwcCwgc2t1LCB0eXBlLCBuYW1lLCBpbnRlcm5hbFNsdWcsIGRlc2NyaXB0aW9uKTtcbiAgfVxufVxuIl19