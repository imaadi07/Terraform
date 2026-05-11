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

resource "aws_instance" "aws_ec2_resource" {
  instance_type = "t3.micro"
  ami = "ami-0c02fb55956c7d316"
  monitoring = false
  ebs_optimized = false
  disable_api_termination = false
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
