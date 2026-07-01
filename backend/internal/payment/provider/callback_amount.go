package provider

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

func parsePositiveCallbackAmount(field, value string) (float64, error) {
	if strings.TrimSpace(value) == "" {
		return 0, fmt.Errorf("paid callback missing amount field %q", field)
	}
	amount, err := strconv.ParseFloat(value, 64)
	if err != nil || math.IsNaN(amount) || math.IsInf(amount, 0) || amount <= 0 {
		if err == nil {
			err = fmt.Errorf("amount must be positive and finite")
		}
		return 0, fmt.Errorf("paid callback invalid amount field %q: %w", field, err)
	}
	return amount, nil
}
