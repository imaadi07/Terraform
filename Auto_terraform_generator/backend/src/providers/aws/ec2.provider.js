import {
  EC2Client,
  DescribeInstanceTypesCommand,
  DescribeKeyPairsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeImagesCommand,
  DescribeVpcsCommand,
  DescribeAvailabilityZonesCommand,
} from "@aws-sdk/client-ec2";

const client = new EC2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getInstanceTypes() {
  const instanceTypes = [];
  let NextToken;

  do {
    const response = await client.send(
      new DescribeInstanceTypesCommand({ NextToken })
    );

    instanceTypes.push(...(response.InstanceTypes || []));
    NextToken = response.NextToken;
  } while (NextToken);

  return instanceTypes.map((item) => ({
    label: item.InstanceType,
    value: item.InstanceType,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getAvailabilityZones() {
  const response = await client.send(
    new DescribeAvailabilityZonesCommand({})
  );

  return (response.AvailabilityZones || []).map((item) => ({
    label: item.ZoneName,
    value: item.ZoneName,
  }));
}

export async function getKeyPairs() {
  const response = await client.send(
    new DescribeKeyPairsCommand({})
  );

  return (response.KeyPairs || []).map((item) => ({
    label: item.KeyName,
    value: item.KeyName,
  }));
}

export async function getVpcs() {
  const response = await client.send(
    new DescribeVpcsCommand({})
  );

  return (response.Vpcs || []).map((item) => {
    const name = item.Tags?.find((tag) => tag.Key === "Name")?.Value;

    return {
      label: name ? `${name} (${item.VpcId})` : item.VpcId,
      value: item.VpcId,
    };
  });
}

export async function getSubnets(vpcId) {
  const response = await client.send(
    new DescribeSubnetsCommand({
      Filters: vpcId
        ? [{ Name: "vpc-id", Values: [vpcId] }]
        : undefined,
    })
  );

  return (response.Subnets || []).map((item) => ({
    label: `${item.SubnetId} (${item.AvailabilityZone})`,
    value: item.SubnetId,
  }));
}

export async function getSecurityGroups(vpcId) {
  const response = await client.send(
    new DescribeSecurityGroupsCommand({
      Filters: vpcId
        ? [{ Name: "vpc-id", Values: [vpcId] }]
        : undefined,
    })
  );

  return (response.SecurityGroups || []).map((item) => ({
    label: `${item.GroupName} (${item.GroupId})`,
    value: item.GroupId,
  }));
}

export async function getAmis() {
  const response = await client.send(
    new DescribeImagesCommand({
      Owners: ["amazon"],
    })
  );

  return (response.Images || [])
    .sort(
      (a, b) =>
        new Date(b.CreationDate) - new Date(a.CreationDate)
    )
    .slice(0, 50)
    .map((item) => ({
      label: `${item.Name}`,
      value: item.ImageId,
    }));
}
