import MenuBar from "../MenuBar";
import TabNav, { type TabNavItem } from "../TabNav";

export type EventSection<T extends string> = TabNavItem<T>;

// Moves between an event's sections: a side nav on desktop, a menu bar on
// smaller screens (CSS decides which one is visible).
export default function EventNav<T extends string>({
  sections,
  value,
  onChange,
  label = "Event sections",
}: {
  sections: EventSection<T>[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <>
      <TabNav
        className="event-sidenav"
        label={label}
        orientation="vertical"
        indicator="right"
        items={sections}
        value={value}
        onChange={onChange}
      />
      <div className="event-section-picker">
        <MenuBar label={label} items={sections} value={value} onChange={onChange} />
      </div>
    </>
  );
}
