"use client";

import { generateRoomId } from "@/lib/client-utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../styles/Home.module.css";

export default function Page() {
  const router = useRouter();

  const startMeeting = () => {
    router.push(`/rooms/${generateRoomId()}`);
  };

  return (
    <main className={styles.main} data-lk-theme="default">
      <section className="max-w-xl text-center flex flex-col items-center justify-center h-screen">
        <Image
          className="mb-18"
          src={process.env.NEXT_PUBLIC_HOST_IMAGE || "/images/garth.png"}
          width={300}
          height={300}
          alt="logo"
        />
        <div className="p-1">
          <h1 className="text-3xl font-semibold md:text-4xl">
            Video Calls With AI Agents
          </h1>
          <p className="text-xl mt-4">lets dev stuff</p>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col mt-8 gap-4 justify-center w-full md:flex-row md:w-auto">
            <button className="lk-button" onClick={startMeeting}>
              New Meeting
            </button>
          </div>

          {/* <div className="flex flex-col gap-4 mt-6 justify-items-start">
            <div className="flex flex-row gap-4">
              <input
                id="use-e2ee"
                type="checkbox"
                checked={e2ee}
                onChange={(ev) => setE2ee(ev.target.checked)}
              />
              <Label htmlFor="use-e2ee">Enable end-to-end encryption</Label>
            </div>
            {e2ee && (
              <div className="flex flex-row gap-4">
                <Label htmlFor="passphrase">Passphrase</Label>
                <input
                  id="passphrase"
                  type="password"
                  value={sharedPassphrase}
                  onChange={(ev) => setSharedPassphrase(ev.target.value)}
                />
              </div>
            )}
          </div> */}
        </div>
      </section>
    </main>
  );
}
