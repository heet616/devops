variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "key_name" {
  description = "EC2 key pair name"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH"
  type        = string
  default     = "0.0.0.0/0"
}

variable "instances" {
  description = "Map of instance roles to their configuration"
  type = map(object({
    instance_type = string
  }))

  default = {
    app = {
      instance_type = "t3.micro"
    }
    monitoring = {
      instance_type = "t3.micro"
    }
    jenkins = {
      instance_type = "t3.micro"
    }
  }
}
