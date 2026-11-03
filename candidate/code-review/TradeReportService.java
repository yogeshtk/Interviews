import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Generated from the T+1 transaction reporting spec.
 * Review this change: would you merge it?
 */
public class TradeReportService {

    public record Trade(String ref, LocalDateTime executedAt, double price,
                        long quantity, String venue, String counterpartyLei) {}

    public record Report(String ref, LocalDate tradeDate, double price,
                         long quantity, String venue, String counterpartyLei,
                         LocalDate dueDate, String type) {}

    public interface RegulatorClient {
        boolean submit(Report report);
    }

    private static final String DEFAULT_LEI = "UNKNOWN000000000000";

    private final Map<String, Report> reports = new HashMap<>();
    private final RegulatorClient regulator;

    public TradeReportService(RegulatorClient regulator) {
        this.regulator = regulator;
    }

    /** Next business day after the trade date. */
    LocalDate dueDate(LocalDateTime executedAt) {
        LocalDate d = executedAt.toLocalDate().plusDays(1);
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY
                || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            d = d.plusDays(1);
        }
        return d;
    }

    boolean isLate(Report r) {
        return LocalDate.now().isAfter(r.dueDate());
    }

    String cleanLei(String lei) {
        if (lei == null || lei.length() != 20) {
            return DEFAULT_LEI;
        }
        return lei;
    }

    double roundPrice(double price) {
        return Math.round(price * 100) / 100.0;
    }

    public Report create(Trade t) {
        Report r = new Report(t.ref(), t.executedAt().toLocalDate(),
                roundPrice(t.price()), t.quantity(), t.venue(),
                cleanLei(t.counterpartyLei()), dueDate(t.executedAt()), "NEW");
        reports.put(r.ref(), r);
        return r;
    }

    public Report amend(Trade corrected) {
        Report r = new Report(corrected.ref(), corrected.executedAt().toLocalDate(),
                roundPrice(corrected.price()), corrected.quantity(), corrected.venue(),
                cleanLei(corrected.counterpartyLei()), dueDate(corrected.executedAt()),
                "AMEND");
        reports.put(r.ref(), r);
        return r;
    }

    public void submitAll() {
        List<Report> batch = new ArrayList<>(reports.values());
        for (Report r : batch) {
            boolean ok = false;
            while (!ok) {
                ok = regulator.submit(r);
            }
        }
    }

    public Report get(String ref) {
        return reports.get(ref);
    }
}
