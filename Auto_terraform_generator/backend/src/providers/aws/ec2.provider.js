import {
  EC2Client,
  DescribeInstanceTypesCommand,
  DescribeKeyPairsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeImagesCommand,
} from "@aws-sdk/client-ec2";

const client = new EC2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getInstanceTypes() {
  const response = await client.send(
    new DescribeInstanceTypesCommand({})
  );

  return response.InstanceTypes.map((item) => ({
    label: item.InstanceType,
    value: item.InstanceType,
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getKeyPairs() {
  const response = await client.send(
    new DescribeKeyPairsCommand({})
  );

  return response.KeyPairs.map((item) => ({
    label: item.KeyName,
    value: item.KeyName,
  }));
}

export async function getSubnets() {
  const response = await client.send(
    new DescribeSubnetsCommand({})
  );

  return response.Subnets.map((item) => ({
    label: `${item.SubnetId} (${item.AvailabilityZone})`,
    value: item.SubnetId,
  }));
}

export async function getSecurityGroups() {
  const response = await client.send(
    new DescribeSecurityGroupsCommand({})
  );

  return response.SecurityGroups.map((item) => ({
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

  return response.Images
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