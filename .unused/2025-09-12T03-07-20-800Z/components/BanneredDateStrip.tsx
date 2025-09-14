import React from "react";
import styles from "./BanneredDateStrip.module.css";
import DateStrip from "@/components/DateStrip";

type Props = React.ComponentProps<typeof DateStrip>;

export default function BanneredDateStrip(props: Props) {
  return (
    <div className={styles.wrap}>
      <DateStrip {...props} />
    </div>
  );
}
