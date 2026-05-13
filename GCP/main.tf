terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

variable "gcp_project_id" {
  description = "The GCP project ID to deploy resources into."
  type        = string
}

resource "google_storage_bucket" "gcp_storage_bucket_resource" {
  name = "aditya-storage-8472"
  location = "ASIA"
  storage_class = "STANDARD"
  force_destroy = true
  uniform_bucket_level_access = true
  labels = {
    
  }
  
}
