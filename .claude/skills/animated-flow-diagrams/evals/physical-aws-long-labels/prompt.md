---
tags: [animated-flow-diagrams]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

physical deployment diagram for our customer portal on AWS eu-west-2: CloudFront, an ALB, two API pods in an EKS cluster in different AZs, an ElastiCache Redis cluster for sessions and rate limiting, RDS postgres primary, an SQS email-outbox queue with a notification worker on an EC2 auto-scaling group, and SES. some of the names are long. show the request path and then the email flow. regions/VPC/cluster boundaries please
