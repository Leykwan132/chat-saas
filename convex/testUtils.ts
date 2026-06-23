import type { GenericMutationCtx, GenericActionCtx, SchemaDefinition } from "convex/server";
import type { TestConvex } from "convex-test";

type ComponentCtx = GenericMutationCtx<any> & Pick<GenericActionCtx<any>, "storage">;

export type TestConvexWithComponents<SchemaDef extends SchemaDefinition<any, boolean> = SchemaDefinition<any, boolean>> = TestConvex<SchemaDef> & {
  runInComponent: <Output>(
    componentPath: string,
    func: (ctx: ComponentCtx) => Promise<Output>,
  ) => Promise<Output>;
};

export function withComponents<SchemaDef extends SchemaDefinition<any, boolean>>(
  t: TestConvex<SchemaDef>,
): TestConvexWithComponents<SchemaDef> {
  return t as unknown as TestConvexWithComponents<SchemaDef>;
}
