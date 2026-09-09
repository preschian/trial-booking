import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>
        That booking or page is missing.{" "}
        <Link href="/">Return to trial classes</Link>.
      </p>
    </main>
  );
}
