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

data "google_compute_subnetwork" "https_www_googleapis_com_compute_v1_projects_project_bd03d55b_34a7_4563_8d3_regions_asia_southeast1_subnetworks_default" {
  id = "https://www.googleapis.com/compute/v1/projects/project-bd03d55b-34a7-4563-8d3/regions/asia-southeast1/subnetworks/default"
}

resource "google_compute_instance" "gcp_compute_instance_resource" {
  name = "aditya"
  machine_type = "e2-medium"
  zone = "asia-south1-a"
  can_ip_forward = true
  allow_stopping_for_update = false
  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-1204-lts"
      size = 20
      type = "pd-balanced"
    }
    auto_delete = true
  }
  network_interface {
    network = "https://www.googleapis.com/compute/v1/projects/project-bd03d55b-34a7-4563-8d3/global/networks/default"
    subnetwork {
      __tfRef = "data.google_compute_subnetwork.https_www_googleapis_com_compute_v1_projects_project_bd03d55b_34a7_4563_8d3_regions_asia_southeast1_subnetworks_default.self_link"
    }
    access_config {
      network_tier = "PREMIUM"
    }
  }
  shielded_instance_config {
    enable_secure_boot = false
    enable_vtpm = true
    enable_integrity_monitoring = true
  }
  service_account {
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
  deletion_protection = false
}
