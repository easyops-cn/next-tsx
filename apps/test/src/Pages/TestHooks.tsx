import { usePermissions, usePipes } from "@next-tsx/core";

export default function TestHooks() {
  const permissions = usePermissions();
  const pipes = usePipes();

  const hasPermission = permissions.check("user_service:api_account_manager");
  const formattedValue = pipes.jsonStringify({ foo: "bar" });

  return (
    <div>
      <div>Has Permission: {String(hasPermission)}</div>
      <div>Formatted Value: {formattedValue}</div>
    </div>
  );
}
