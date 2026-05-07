output "instance_public_ips" {
  description = "Public IPs by role"
  value       = { for role, inst in aws_instance.healthtech : role => inst.public_ip }
}

output "instance_public_dns" {
  description = "Public DNS names by role"
  value       = { for role, inst in aws_instance.healthtech : role => inst.public_dns }
}

output "instance_private_ips" {
  description = "Private IPs by role"
  value       = { for role, inst in aws_instance.healthtech : role => inst.private_ip }
}

output "app_public_ip" {
  description = "Public IP for app instance"
  value       = aws_instance.healthtech["app"].public_ip
}

output "monitoring_public_ip" {
  description = "Public IP for monitoring instance"
  value       = aws_instance.healthtech["monitoring"].public_ip
}

output "jenkins_public_ip" {
  description = "Public IP for Jenkins instance"
  value       = aws_instance.healthtech["jenkins"].public_ip
}

output "app_private_ip" {
  description = "Private IP for app instance"
  value       = aws_instance.healthtech["app"].private_ip
}
