// Returns a copy of a record with string keys sorted.
export const sorted = (record) => Object.fromEntries(Object.keys(record)
    .sort()
    .map((key) => [key, record[key]]));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3Jkcy5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicmVjb3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxzREFBc0Q7QUFDdEQsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLENBQWdDLE1BQVMsRUFBSyxFQUFFLENBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ2hCLElBQUksRUFBRTtLQUNOLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFJldHVybnMgYSBjb3B5IG9mIGEgcmVjb3JkIHdpdGggc3RyaW5nIGtleXMgc29ydGVkLlxuZXhwb3J0IGNvbnN0IHNvcnRlZCA9IDxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgYW55Pj4ocmVjb3JkOiBUKTogVCA9PlxuICBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgT2JqZWN0LmtleXMocmVjb3JkKVxuICAgICAgLnNvcnQoKVxuICAgICAgLm1hcCgoa2V5KSA9PiBba2V5LCByZWNvcmRba2V5XV0pXG4gICk7XG4iXX0=