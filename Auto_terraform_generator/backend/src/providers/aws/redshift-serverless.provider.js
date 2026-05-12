import {
  ListNamespacesCommand,
  RedshiftServerlessClient,
} from "@aws-sdk/client-redshift-serverless";

const client = new RedshiftServerlessClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getNamespaces() {
  const namespaces = [];
  let nextToken;

  do {
    const response = await client.send(
      new ListNamespacesCommand({ nextToken })
    );

    namespaces.push(...(response.namespaces || []));
    nextToken = response.nextToken;
  } while (nextToken);

  return namespaces
    .map((item) => ({
      label: item.namespaceName,
      value: item.namespaceName,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
