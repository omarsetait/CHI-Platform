import fs from "fs";
import path from "path";

const schemaPath = path.resolve(process.cwd(), "shared/schema.ts");
let content = fs.readFileSync(schemaPath, "utf-8");

// 1. Update imports
content = content.replace(
    'import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";',
    'import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, pgEnum, pgSchema } from "drizzle-orm/pg-core";'
);

// 2. Add ihop schema definition
if (!content.includes('export const ihop = pgSchema("ihop");')) {
    content = content.replace(
        /import { z } from "zod";\n/,
        'import { z } from "zod";\n\nexport const ihop = pgSchema("ihop");\n'
    );
}

// 3. Replace pgTable and pgEnum
// Using regex with boundary to avoid accidental replacements if any
content = content.replace(/\bpgTable\(/g, 'ihop.table(');
content = content.replace(/\bpgEnum\(/g, 'ihop.enum(');

fs.writeFileSync(schemaPath, content);
console.log("Migrated shared/schema.ts to 'ihop' namespace");
