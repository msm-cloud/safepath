import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import Card from './Card';
import Text from './Text';

export type ListGroupProps = {
  children: ReactNode;
  // Small heading above the card, e.g. "Account".
  title?: string;
};

// A card of ListRow / SwitchRow items with hairline dividers between them.
// Conditional rows (`{isGuardian && <ListRow … />}`) are skipped cleanly,
// so no divider is left dangling.
export default function ListGroup({ children, title }: ListGroupProps) {
  const { colors, spacing } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={{ gap: spacing.sm }}>
      {title && (
        <Text
          variant="micro"
          color="textMuted"
          accessibilityRole="header"
          style={{ paddingHorizontal: spacing.xs, textTransform: 'uppercase' }}
        >
          {title}
        </Text>
      )}
      <Card padding="none">
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg }} />
            )}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}
