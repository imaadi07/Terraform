terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_subnet" "subnet_04da59606d0c4b5ac" {
  id = "subnet-04da59606d0c4b5ac"
}

resource "aws_instance" "aws_ec2_resource" {
  instance_type = "t3.micro"
  ami = "ami-0f3afae211616c412"
  monitoring = false
  ebs_optimized = false
  disable_api_termination = false
  subnet_id = data.aws_subnet.subnet_04da59606d0c4b5ac.id
  vpc_security_group_ids = ["sg-0ab2d75f0244b6f84"]
  associate_public_ip_address = true
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted = false
    delete_on_termination = true
  }
  instance_initiated_shutdown_behavior = "stop"
  tenancy = "default"
}
