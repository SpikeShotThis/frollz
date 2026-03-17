import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { Database } from "arangojs";
import { SchemaOptions } from "arangojs/collections";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@Inject("ARANGO_DB") private readonly db: Database) {}

  async onModuleInit() {
    await this.initializeCollections();
    await this.initializeDefaultCollections();

    if (this.isDefaultDataImportDisabled()) {
      console.log(
        "Default data import is disabled (DISABLE_DEFAULT_DATA_IMPORT). Skipping seed data load.",
      );
      return;
    }

    await this.loadSeedData();
    await this.populateMainCollections();
  }

  private isDefaultDataImportDisabled(): boolean {
    const raw = process.env.DISABLE_DEFAULT_DATA_IMPORT ?? "false";
    const normalized = raw.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  private loadSchema(collectionName: string): SchemaOptions | undefined {
    // Strip _default suffix so both film_formats and film_formats_default share the same schema
    const baseName = collectionName.replace(/_default$/, "");
    const schemaPath = path.join(
      process.cwd(),
      "db-init",
      "schemas",
      `${baseName}.schema.json`,
    );
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, "utf8")) as SchemaOptions;
    }
    return undefined;
  }

  private async initializeCollections() {
    const collections = [
      "film_formats",
      "stocks",
      "rolls",
      "roll_states",
      "tags",
      "stock_tags",
    ];

    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        const exists = await collection.exists();
        const schema = this.loadSchema(collectionName);

        if (!exists) {
          await collection.create(schema ? { schema } : undefined);
          console.log(
            `Created collection: ${collectionName}${schema ? " (with schema)" : ""}`,
          );
        } else if (schema) {
          await collection.properties({ schema });
          console.log(
            `Applied schema to existing collection: ${collectionName}`,
          );
        }
      } catch (error) {
        console.error(`Error creating collection ${collectionName}:`, error);
      }
    }
  }

  private async initializeDefaultCollections() {
    const defaultCollections = [
      "film_formats_default",
      "stocks_default",
      "tags_default",
      "stock_tags_default",
    ];

    for (const collectionName of defaultCollections) {
      try {
        const collection = this.db.collection(collectionName);
        const exists = await collection.exists();
        const schema = this.loadSchema(collectionName);

        if (!exists) {
          await collection.create(schema ? { schema } : undefined);
          console.log(
            `Created default collection: ${collectionName}${schema ? " (with schema)" : ""}`,
          );
        } else if (schema) {
          await collection.properties({ schema });
          console.log(
            `Applied schema to existing default collection: ${collectionName}`,
          );
        }
      } catch (error) {
        console.error(
          `Error creating default collection ${collectionName}:`,
          error,
        );
      }
    }
  }

  // Maps the base filename (after stripping the numeric prefix) to its target _default collection.
  private readonly seedCollectionMap: Record<string, string> = {
    "film-formats": "film_formats_default",
    stocks: "stocks_default",
    tags: "tags_default",
    "stock-tags": "stock_tags_default",
  };

  // For each collection, declares which fields are foreign-key references and which
  // collection they must resolve against before insertion.
  private readonly seedReferenceMap: Record<
    string,
    { field: string; collection: string }[]
  > = {
    stocks_default: [
      { field: "formatKey", collection: "film_formats_default" },
      { field: "baseStockKey", collection: "stocks_default" },
    ],
    stock_tags_default: [
      { field: "tagKey", collection: "tags_default" },
      { field: "stockKey", collection: "stocks_default" },
    ],
  };

  private async loadSeedData() {
    const defaultDir = path.join(process.cwd(), "db-init", "default");

    const files = fs
      .readdirSync(defaultDir)
      .filter((f: string) => /^\d{4}-.+\.json$/.test(f))
      .sort(); // lexicographic sort respects the 4-digit prefix ordering

    for (const filename of files) {
      const baseName = filename.replace(/^\d{4}-/, "").replace(/\.json$/, "");
      const collectionName = this.seedCollectionMap[baseName];

      if (!collectionName) {
        console.warn(
          `No collection mapping for seed file: ${filename} — skipping`,
        );
        continue;
      }

      try {
        const collection = this.db.collection(collectionName);
        const { count } = await collection.count();
        if (count > 0) continue;

        const filePath = path.join(defaultDir, filename);
        const now = new Date().toISOString();
        const raw: Record<string, unknown>[] = JSON.parse(
          fs.readFileSync(filePath, "utf8"),
        );

        // Validate all foreign-key references before inserting anything
        const refs = this.seedReferenceMap[collectionName] ?? [];
        for (const doc of raw) {
          for (const ref of refs) {
            const refKey = doc[ref.field] as string | undefined;
            if (refKey) {
              const refCollection = this.db.collection(ref.collection);
              const exists = await refCollection.documentExists(refKey);
              if (!exists) {
                throw new Error(
                  `Reference error in ${filename}: ${ref.field} "${refKey}" not found in ${ref.collection}`,
                );
              }
            }
          }
        }

        const data = raw.map((doc) => ({
          ...doc,
          createdAt: doc.createdAt ?? now,
        }));

        await collection.saveAll(data);
        console.log(
          `Loaded ${data.length} records into ${collectionName} from ${filename}`,
        );
      } catch (error) {
        console.error(`Error loading seed data from ${filename}:`, error);
        throw error; // re-throw so the app fails fast on bad seed data
      }
    }
  }

  private async populateMainCollections() {
    const collectionMappings = [
      { main: "film_formats", default: "film_formats_default" },
      { main: "stocks", default: "stocks_default" },
      { main: "tags", default: "tags_default" },
      { main: "stock_tags", default: "stock_tags_default" },
    ];

    for (const mapping of collectionMappings) {
      try {
        const mainCollection = this.db.collection(mapping.main);

        const mainCount = await mainCollection.count();

        if (mainCount.count === 0) {
          const cursor = await this.db.query(
            `FOR doc IN ${mapping.default} RETURN doc`,
          );
          const documents = await cursor.all();

          if (documents.length > 0) {
            await mainCollection.saveAll(documents);
            console.log(
              `Populated ${mapping.main} with ${documents.length} records from ${mapping.default}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `Error populating main collection ${mapping.main}:`,
          error,
        );
      }
    }
  }

  getCollection(name: string) {
    return this.db.collection(name);
  }

  query(aql: string, bindVars?: any) {
    return this.db.query(aql, bindVars);
  }
}
