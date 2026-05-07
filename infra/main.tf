terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_security_group" "app_sg" {
  id = var.app_sg_id
}

data "aws_security_group" "monitoring_sg" {
  id = var.monitoring_sg_id
}

data "aws_security_group" "jenkins_sg" {
  id = var.jenkins_sg_id
}

locals {
  user_data = <<-EOF
              #!/bin/bash
              set -e

              sudo apt-get update -y
              sudo apt-get install -y ca-certificates curl gnupg lsb-release

              sudo install -m 0755 -d /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              sudo chmod a+r /etc/apt/keyrings/docker.gpg

              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

              sudo apt-get update -y
              sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
              sudo usermod -aG docker ubuntu

              if [ ! -f /swapfile ]; then
                sudo fallocate -l 2G /swapfile
                sudo chmod 600 /swapfile
                sudo mkswap /swapfile
                sudo swapon /swapfile
                echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
              fi

              sudo systemctl enable docker
              sudo systemctl start docker
              EOF

  sg_by_role = {
    app        = data.aws_security_group.app_sg.id
    monitoring = data.aws_security_group.monitoring_sg.id
    jenkins    = data.aws_security_group.jenkins_sg.id
  }
}

resource "aws_instance" "healthtech" {
  for_each               = var.instances
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = each.value.instance_type
  key_name               = var.key_name
  subnet_id              = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [local.sg_by_role[each.key]]
  user_data              = local.user_data

  tags = {
    Name = "healthtech-${each.key}"
    Role = each.key
  }
}
