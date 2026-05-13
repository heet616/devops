import argparse
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser(description="Render Prometheus config with app private IP.")
    parser.add_argument("--app-ip", required=True, help="App private IP to use for targets")
    parser.add_argument(
        "--template",
        default="prometheus.yml",
        help="Path to prometheus.yml template (default: prometheus.yml)",
    )
    parser.add_argument(
        "--output",
        default="prometheus.yml",
        help="Output path for rendered config (default: prometheus.yml)",
    )
    args = parser.parse_args()

    template_path = Path(args.template)
    output_path = Path(args.output)
    content = template_path.read_text(encoding="utf-8")
    rendered = content.replace("APP_PRIVATE_IP", args.app_ip)
    output_path.write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
