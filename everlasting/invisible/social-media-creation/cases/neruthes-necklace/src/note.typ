#set cite(style: "chicago-notes")
#show bibliography: none


#set page(width: 20pt * 29, height: 20pt * 50, margin: 40pt)
#set text(size: 20pt, font: ("Noto Sans CJK SC",))
#set par(leading: 0.8em, spacing: 1.0em)


#v(18mm)
#align(left)[
  #text(size: 36pt)[
    用最说人话、最不绕弯子的方式聊聊 Neruthes 项链 @Neruthes2026 的巧思与趣味
  ]
]
#v(8mm)


#show heading.where(depth: 2): set block(above: 1.66em, below: 1.11em)
#show heading.where(depth: 1): set block(above: 2.3em, below: 1.8em)
#show math.equation: set text(font: ("New Computer Modern Math", "Noto Serif CJK SC"))

#set table(inset: 4mm)
#show table: set text(size: 18pt)
#set strong(delta: 200)

#block(
  fill: rgb("#f8f9fa"),
  stroke: (left: 4pt + rgb("#2b6cb0")),
  inset: 1.2em,
  radius: (right: 4pt),
)[
  #set par(first-line-indent: 0pt)
  *核心导读*

  Cantor 集等经典分形通常来自嵌套的区间收缩。*Neruthes 项链* 则采用一种非嵌套的二进制递归：每一步把相邻黑白格子替换成新的四格结构，始终保持黑格子总长度为 $1/2$，却不要求新一层包含在旧一层中。

  这个确定性规则同时产生两种看似矛盾的性质。一方面，无论怎样选择 Coin sequence，各层 membership indicators 都是独立公平 Bernoulli 随机变量；在二进制序列空间中，不同 Coin sequence 还通过精确的树自同构相互对应。另一方面，投影到实数区间后，二进制端点的双重编码会破坏这种普遍等价，使区间 liminf、连通块数量和分形维数对 Coin sequence 敏感。

  本文的中心构造之一是：保持局部平衡替换规则不变，只改变生成 Coin sequence 的有限状态约束，就能得到一族具有精确维数公式的分形闭包。区间 liminf 本身可数、Hausdorff 维数为零，但上下盒维数严格为正；闭包的 Hausdorff 维数和盒维数则由有限阶递推的特征根精确决定。

  核心张力是：*符号树结构具有普遍等价性，而欧氏区间几何对编码方式和有限状态约束保持敏感。* 我们将这种现象称为 *coding sensitivity*。
]




#v(2em)
#set heading(numbering: "1.1.1.1.  ")




= 构造的巧思：守恒，但不嵌套

Cantor 集采用递减集合序列
$
  A_1 supset A_2 supset A_3 supset dots
$
Neruthes 项链不要求嵌套，只要求每个局部替换保持黑白数量平衡。它守恒的是每层总占据长度，而不是集合之间的包含关系。

先把单位区间分成两个格子 $10$，其中 $1$ 表示黑格子，$0$ 表示白格子。初始黑色区域是 $A_1 = [0, 1/2)$，长度恰好 $1/2$。

每一层把相邻两个格子看作一个父节点对。关键不变量是：每个父节点对总是恰好包含一个黑格子和一个白格子，因此只可能是 $01$ 或 $10$。这个性质由替换规则自动保持。

给定 Coin sequence $sigma = (sigma_1, sigma_2, dots)$。每个父节点对根据对应的 Coin bit 决定替换方式：Coin bit 为 $1$ 时，$01 -> 1001$，$10 -> 0110$；Coin bit 为 $0$ 时，$01 -> 0110$，$10 -> 1001$。两种输出 $0110$ 和 $1001$ 都恰好含两个 $1$ 和两个 $0$，并且各自又分成两个平衡子对。因此平衡性逐层保持。

第 $n$ 层有 $2^(n-1)$ 个父节点对，每个产生两个黑格子，所以第 $n+1$ 层有 $2^n$ 个黑格子，总长度 $2^n dot 2^(-(n+1)) = 1/2$。对每个有限阶段都有 $lambda(A_n)=1/2$，且对所有确定性 Coin sequence 成立。

守恒不等于嵌套：替换后两个黑格子可能分布在整个父节点对的不同位置，新一层黑格子不一定包含在上一层黑格子中。这正是 Neruthes 项链与经典嵌套分形的第一个重要区别。







= 确定性规则如何产生独立公平随机变量

对每个 $x in [0,1)$，采用以零结尾的规范二进制展开 $x = 0.x_1 x_2 x_3 dots_2$。定义 $Y_n(x) = bb(1)_(A_n)(x)$。

固定前 $n-1$ 位，它们确定第 $n$ 层中一个相邻两格。由于每个相邻格子对恰好有一个黑格子，$Y_n$ 必须随最后一位 $x_n$ 翻转。因此存在只依赖前 $n-1$ 位的函数 $phi_n$，使得
$
  Y_n(x) = x_n xor phi_n(x_1, dots, x_(n-1)).
$
初始配置 $10$ 给出 $phi_1(emptyset)=1$。这就是 *triangular bit representation*。

在 Lebesgue 测度下，二进制位 $x_1, x_2, dots$ 是独立公平 Bernoulli。而 $phi_n$ 只依赖前 $n-1$ 位。当历史固定时，$x_n$ 仍是公平硬币；公平硬币 XOR 一个历史决定的固定比特，仍然是公平硬币。因此
$
  P(Y_n=1 | x_1, dots, x_(n-1)) = 1/2,
$
且 $Y_n$ 独立于此前所有二进制位生成的信息。逐层应用，得到 $(Y_n)_(n >= 1)$ 是一列独立同分布的公平 Bernoulli 随机变量。

随机性来自观察点 $x$ 的二进制位，而不是来自递归规则本身。Coin sequence 仍然完全确定；它只决定具体翻转方式，不改变 membership indicator 的概率律。

由强大数定律，对几乎处处的 $x$，
$
  lim_(N -> infinity) 1/N sum_(n=1)^N Y_n(x) = 1/2.
$
由第二 Borel–Cantelli 引理，$lambda(limsup_n A_n)=1$，$lambda(liminf_n A_n)=0$。几乎每个点无限多次进入黑色区域，但几乎没有点从某阶段起永远留在黑色区域。





= 二进制树上的普遍等价，以及欧氏区间中的端点问题

考虑无限二进制序列空间 $Omega = {0, 1}^NN$。给定 Coin sequence $sigma$，三角关系定义变换
$
  T_sigma(beta)_n = beta_n xor phi_n^sigma(beta_1, dots, beta_(n-1)).
$
前缀固定后，第 $n$ 位要么保持不变，要么被翻转，因此 $T_sigma$ 是根二叉树自同构。若两个序列第一次在第 $k$ 位不同，定义 ultrametric $d(beta, gamma) = 2^(-k)$。树自同构保持共同前缀长度，所以 $d(T_sigma(beta), T_sigma(gamma)) = d(beta, gamma)$；它也保持公平硬币 product measure。

对任意两个 Coin sequence $sigma, tau$，定义
$
  H_(sigma, tau) = T_tau^(-1) compose T_sigma.
$
它是超度量等距，并把每一层的 occupied set 精确映射到另一条项链的对应层：
$
  H_(sigma, tau)(cal(A)_n^sigma) = cal(A)_n^tau.
$
因此，如果只观察根二叉树及其超度量结构，所有确定性 Coin sequence 产生的 Neruthes 项链属于同一个等价类。Coin sequence 改变了坐标表达，却没有产生不同的内在二叉树几何。

但是，二进制树不等于实数直线。二进制编码
$
  pi(beta) = sum_(n=1)^infinity beta_n 2^(-n)
$
不是单射：$0.011111 dots_2 = 0.100000 dots_2 = 1/2$。因此，树等距未必能下降为实数区间上的单值映射。

取 $sigma = (1, 1, 1, dots)$ 和 $tau = (0, 0, 0, dots)$。对 $1/2$ 的两种展开
$
  beta = 0.011111 dots_2, quad beta' = 0.100000 dots_2,
$
树共轭给出
$
  H_(sigma, tau)(beta) = 0.000000 dots_2, quad
  H_(sigma, tau)(beta') = 1.111111 dots_2.
$
投影后分别是 $0$ 和 $1$。同一个实数的两种展开，在树共轭下变成了两个不同实数。所以这个共轭不能下降为整个 $[0, 1]$ 上的单值映射。

这揭示了本文的核心概念 *coding sensitivity*：符号空间中所有 Coin sequence 之间存在精确树等距共轭，但经过二进制投影后，端点双重编码会破坏这种共轭。不能仅凭树自同构就断言两个区间实现之间存在全局 homeomorphism、递增同胚或 bi-Lipschitz 等价。符号空间的普遍性与欧氏空间的差异，是同一递归结构在两种几何环境下的表现。






= 端点、符号集合与区间 liminf

在符号空间中定义
$
  cal(E)_1^sigma = {beta in Omega : (T_sigma(beta))_n = 1 " eventually"},
$
以及 $cal(E)_0^sigma$ 类似。由于 $T_sigma$ 是树自同构，这两个集合都是可数稠密集。

投影到实数区间后，必须区分三个对象：符号 eventual-membership set、其二进制投影、以及用规范展开定义的区间 liminf。它们并不总是相同。

最极端的例子是 $sigma = (1, 1, 1, dots)$。在这个情形下，符号空间中使输出位最终恒为 $1$ 的路径，其输入序列最终都退化为尾部全为 $1$。但规范二进制展开排除尾部全 $1$ 的序列，因此
$
  liminf_(n -> infinity) A_n = emptyset.
$
另一方面，对这个具体 Coin sequence，端点分析可证明 $limsup_n A_n = [0, 1)$。独立性定理只保证 limsup 有全测度、liminf 测度为零；它不能单独推出 limsup 恰好是整个区间，也不能推出 liminf 为空。这两个精确集合结论依赖具体递归结构和规范展开下的端点分析。

虽然区间 liminf 为空，符号 eventual-one set 仍是可数稠密的，其投影仍可数稠密，且 Hausdorff 和 packing 维数为零、上下盒维数为一。被端点约定排除的是符号 eventual-one set 中那些输入侧非规范的路径，而不是整个符号集合的投影。符号集合的投影、区间 liminf、以及区间 liminf 的闭包，是三个不能随意互换的对象。这就引出一个自然的问题：能否系统地选择 Coin sequence，使区间 liminf 的闭包具有精确可算的维数？下一节给出一个肯定的答案。







= 有限状态约束如何生成精确分形维数

对每个整数 $k >= 2$，构造一个具有 $k+2$ 个状态的有限状态自动机，满足兄弟互补条件
$
  epsilon(delta(q, 0)) xor epsilon(delta(q, 1)) = 1.
$
这个条件保证自动机生成的 Coin sequence 与原有 balanced-pair orientation 相容。对所有 $k$，局部 Expand 规则始终不变；变化的只是生成 Coin sequence 的有限状态约束。

对这一族自动机，区间 liminf 集具有精确描述
$
  L_-^((k))
  =
  {pi(beta) : beta in Omega_"can", beta " avoids " 0^k, beta " eventually equals " 010101 dots}.
$
其闭包为
$
  K_k = pi(X_k), quad
  X_k = {beta in {0, 1}^NN : beta " contains no " 0^k}.
$
可以证明 $overline(L_-^((k))) = K_k$。

由于 $L_-^((k))$ 中每个序列最终周期交替，它是可数集，所以
$
  dim_H L_-^((k)) = dim_P L_-^((k)) = 0.
$
但它与每个允许的二进制 cylinder 都相交。令 $a_m$ 为长度 $m$ 且不含连续 $k$ 个零的二进制字数量。当 $m >= k$ 时，
$
  a_m = a_(m-1) + a_(m-2) + dots + a_(m-k).
$
主导增长率由唯一大于 $1$ 的实根 $lambda_k$ 决定：
$
  lambda_k^k = lambda_k^(k-1) + lambda_k^(k-2) + dots + lambda_k + 1.
$
因此
$
  underline(dim)_B L_-^((k))
  =
  overline(dim)_B L_-^((k))
  =
  d_k = log_2(lambda_k) > 0.
$
一个可数集，居然可以有严格为正的上下盒维数。

闭包 $K_k$ 可按第一个 $1$ 出现的位置分解：
$
  K_k = union_(j=0)^(k-1) f_j(K_k), quad
  f_j(x) = 2^(-(j+1))(1 + x).
$
这是 $k$ 个相似压缩生成的自相似集，压缩比为 $2^(-1), 2^(-2), dots, 2^(-k)$，满足开集条件。其 Hausdorff 维数是
$
  sum_(j=1)^k 2^(-j d_k) = 1
$
的唯一正解，与前面的特征根方程等价。因此
$
  dim_H K_k = dim_B K_k = d_k.
$
所以
$
  dim_H L_-^((k)) = 0, quad dim_H K_k = d_k > 0,
$
但两者具有相同的上下盒维数。

当 $k$ 增大时，禁止词 $0^k$ 变长，允许序列变多，因此 $d_k$ 严格递增并趋近于 $1$。几个具体数值：

#align(center)[
  #table(
    columns: (auto, auto, auto, 1fr),
    align: center,
    stroke: 0.5pt + rgb("#dddddd"),
    fill: (x, y) => if y == 0 { rgb("#edf2f7") } else { none },
    [*参数 $k$*], [*特征根 $lambda_k$*], [*维数 $d_k$*], [*代数背景*],
    [$2$], [$1.618034$], [$0.694242$], [黄金比例根],
    [$3$], [$1.839287$], [$0.879146$], [Tribonacci 常数],
    [$4$], [$1.927562$], [$0.946777$], [四阶递推特征根],
    [$5$], [$1.965948$], [$0.975225$], [五阶递推特征根],
    [$k -> infinity$], [$2$], [$1$], [趋近区间维数],
  )
]

这一族自动机还满足 $L_+^((k)) = [0, 1)$，比独立性定理给出的全测度结论更强。

这个构造不是先指定自相似压缩比再拼分形。实际过程是：先构造满足兄弟互补条件的自动机；由自动机生成合法 Coin sequence；使用原来的 Expand 规则；推导区间 liminf 的符号条件；证明其闭包是禁字子移位的二进制投影；最后从符号分解得到自相似压缩比和精确维数。分形维数不是独立输入的几何参数，而是有限状态符号约束通过原有递归规则产生的结果。





= 有限阶段的欧氏几何：连通块与 Thue–Morse

第 $n$ 层黑色区域的连通分支数记为 $R_n$。可以建立精确计数公式
$
  R_(n+1)
  =
  2^(n-1)
  + N_n(1001)
  - C_n(1001, 1001),
$
其中 $N_n(1001)$ 是产生输出 $1001$ 的父节点对数量，$C_n(1001, 1001)$ 是相邻两个父节点对都产生 $1001$ 的位置数量。因此 $R_(n+1)$ 不能只由 $R_n$ 递推。

两个可精确计算的例子：交替 Coin sequence $sigma = 101010 dots$ 满足 $R_n = 2^(n-2)$（$n >= 2$）；全 $1$ Coin sequence $sigma = 111111 dots$ 满足
$
  R_n = (2^n + (-1)^(n-1))/3.
$
全 $1$ 情形的公式来自父节点对方向词与 Thue–Morse 序列及其补序列的代数对应。注意：全 $1$ Coin sequence 的方向词与 Thue–Morse 结构有关，但把 Thue–Morse 序列本身直接作为 Coin sequence 是另一个问题，其 $R_n$ 的精确公式仍是开放问题。

连通块数量是典型的 Euclidean geometric statistic。树自同构保持共同前缀长度，却不必保持实数直线上的相邻关系。因此，两个在 binary ultrametric 下完全等价的项链，仍可能拥有不同的有限阶段连通块数量。











= 与替换动力系统的联系：相似之处与边界

Neruthes 项链使用局部符号替换，但每个父节点对的替换结果还取决于 Coin sequence 在对应位置的取值。因此它是位置依赖、一般非平稳的递归规则，而不是简单迭代固定 substitution。父节点对 $01$ 和 $10$ 具有相同 Parikh 向量 $(1, 1)$，与 balanced pair algorithm 有形式相似，但 Expand 操作依赖位置和 Coin sequence，不能直接等同于标准 balanced pair algorithm。

本文没有证明 Neruthes 项链一般可以归约为标准 substitution system，也没有证明它与 Rauzy 分形存在直接等价。这些联系目前主要提供结构解释和进一步研究的动机，而不是已证明的普遍等价定理。






= 还有哪些问题没有解决？

有限状态维数：给定满足兄弟互补条件的有限状态自动机，能否从状态转移图直接计算对应区间 liminf 的上下盒维数？在什么条件下，符号前缀增长率与实际区间覆盖数具有相同指数增长率？

符号实现：哪些正则前缀语言或有限标记图路径空间能成为 Neruthes 区间 liminf 闭包的符号约束？兄弟互补条件把可实现类压缩了多少？

连通块与逆问题：周期或自动 Coin sequence 的 $R_n$ 是否有精确递推或渐近公式？已知完整 $R_n$ 序列能否反推 Coin sequence？

树共轭下降：对哪些 Coin sequence 对，$H_(sigma, tau)$ 能下降为区间上的良好映射？何时连续、单调、绝对连续或 bi-Lipschitz？

欧氏等价与维数谱：不同 $K_sigma$ 在 homeomorphism、bi-Lipschitz 或 quasisymmetric 等价下如何分类？Fourier dimension 是否等于 Hausdorff dimension？哪些上下盒维数对可实现？

一个更长远的方向是把自动机约束的覆盖构造作为某些算术覆盖问题的可处理模型，包括受限制的 Kakeya 型问题。但这需要显式算术模型和定量估计，目前只是研究方向，不是已建立的联系。












= 总结：普遍的符号结构与敏感的欧氏实现

Neruthes 项链从局部平衡替换规则出发，展示了确定性递归与概率结构之间的意外联系。每一步保持黑色区域总长度为 $1/2$，但不要求嵌套。对任意确定性 Coin sequence，各层 membership indicators 构成独立公平 Bernoulli 过程；每个 Coin sequence 对应一个根二叉树自同构，任意两个 Coin sequence 之间存在精确树等距共轭。

然而，这种等价不会自动延伸到欧氏区间。二进制编码的双重端点表示可能破坏树共轭的单值性；有限阶段连通块数量、区间 liminf 以及分形闭包，也可能保留 Coin sequence 的具体信息。

本文的中心构造说明这种差异如何产生可计算结构：保持 Expand 规则不变，仅改变满足兄弟互补条件的有限状态约束，就能构造一族具有精确维数公式的紧分形闭包。区间 liminf 可数、Hausdorff 维数为零，却有严格为正的上下盒维数；闭包的 Hausdorff 维数和盒维数由有限阶递推的主导特征根精确决定。

Neruthes 项链的核心机制是：局部平衡递归决定普遍符号结构；Coin sequence 决定具体递归方向；有限状态约束控制可实现符号路径；二进制区间编码将这些符号差异转化为欧氏几何差异。这就是 *coding sensitivity*：符号空间中的精确等价，与欧氏区间中的几何差异，可以同时成立。












#bibliography(bytes(
  "
  @article{Neruthes2026, title={Neruthes necklace: A balanced binary recursion and its binary-tree automorphisms}, author={Neruthes}, year={2026}} 
  ".trim(),
))
